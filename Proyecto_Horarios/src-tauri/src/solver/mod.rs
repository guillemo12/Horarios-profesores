use std::collections::HashMap;
use crate::db::Database;
use crate::models::{Config, ScheduledClass, SolvedLessonDto, SolverProgressEvent, Subject, Teacher};

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct AtomicSlot {
    pub day_of_week: i32, // 1 (Mon) to 5 (Fri)
    pub start_minute: i32, // 540 = 09:00, 570 = 09:30, etc.
}

#[derive(Debug, Clone)]
pub struct AtomicLesson {
    pub lesson_index: usize,
    pub subject_id: String,
    pub group_id: String,
    pub teacher_id: String,
    pub is_pinned: bool,
    pub fixed_slot: Option<AtomicSlot>,
}

pub struct ScheduleSolver {
    db: Database,
}

impl ScheduleSolver {
    pub fn new(db: Database) -> Self {
        Self { db }
    }

    pub fn solve<F>(&self, on_progress: Option<F>) -> Result<Vec<SolvedLessonDto>, String>
    where
        F: Fn(SolverProgressEvent),
    {
        let config = self.db.get_config().map_err(|e| e.to_string())?;
        let teachers = self.db.get_teachers().map_err(|e| e.to_string())?;
        let subjects = self.db.get_subjects().map_err(|e| e.to_string())?;
        let courses = self.db.get_courses().map_err(|e| e.to_string())?;
        let existing_pinned = self.db.get_scheduled_classes().map_err(|e| e.to_string())?
            .into_iter().filter(|c| c.is_pinned).collect::<Vec<_>>();

        let teacher_map: HashMap<String, Teacher> = teachers.into_iter().map(|t| (t.id.clone(), t)).collect();
        let subject_map: HashMap<String, Subject> = subjects.into_iter().map(|s| (s.id.clone(), s)).collect();

        // 1. Generate 30-min atomic slots from config
        let atomic_slots = self.generate_atomic_slots(&config);
        if atomic_slots.is_empty() {
            return Err("No hay franjas horarias válidas configuradas.".to_string());
        }

        // 2. Build list of 30-min atomic lessons
        let mut atomic_lessons = Vec::new();
        let mut lesson_counter = 0;

        for course in &courses {
            for group in &course.groups {
                for subject_id in &course.subjects {
                    let subject = match subject_map.get(subject_id) {
                        Some(s) => s,
                        None => continue,
                    };

                    let teacher_id = group.assignments.get(subject_id)
                        .cloned()
                        .unwrap_or_else(|| group.tutor_id.clone().unwrap_or_else(|| "1".to_string()));

                    let total_half_hours = ((subject.hours * 60.0) / 30.0).round() as i32;

                    for _ in 0..total_half_hours {
                        atomic_lessons.push(AtomicLesson {
                            lesson_index: lesson_counter,
                            subject_id: subject.id.clone(),
                            group_id: group.id.clone(),
                            teacher_id: teacher_id.clone(),
                            is_pinned: false,
                            fixed_slot: None,
                        });
                        lesson_counter += 1;
                    }
                }
            }
        }

        // 3. Map pinned classes to fixed slots
        for pinned in &existing_pinned {
            if let Some(pinned_slots) = self.parse_pinned_slots(pinned, &config) {
                for slot in pinned_slots {
                    if let Some(pos) = atomic_lessons.iter().position(|l| {
                        !l.is_pinned && l.group_id == pinned.group_id && l.subject_id == pinned.subject_id
                    }) {
                        atomic_lessons[pos].is_pinned = true;
                        atomic_lessons[pos].fixed_slot = Some(slot);
                        atomic_lessons[pos].teacher_id = pinned.teacher_id.clone();
                    }
                }
            }
        }

        if atomic_lessons.is_empty() {
            return Ok(Vec::new());
        }

        // 4. Group-by-Group Allocation
        let mut assignment: HashMap<usize, AtomicSlot> = HashMap::new();
        let mut teacher_schedule: HashMap<(String, i32, i32), usize> = HashMap::new(); // (teacher_id, day, min) -> lesson_idx
        let mut group_schedule: HashMap<(String, i32, i32), usize> = HashMap::new(); // (group_id, day, min) -> lesson_idx

        // Place fixed pinned lessons first
        for lesson in &atomic_lessons {
            if let Some(slot) = &lesson.fixed_slot {
                self.place_lesson(lesson.lesson_index, slot, lesson, &mut assignment, &mut teacher_schedule, &mut group_schedule);
            }
        }

        let mut group_map: HashMap<String, Vec<usize>> = HashMap::new();
        for lesson in &atomic_lessons {
            if !lesson.is_pinned {
                group_map.entry(lesson.group_id.clone()).or_default().push(lesson.lesson_index);
            }
        }

        for (_group_id, group_lesson_indices) in group_map {
            let solved = self.backtrack_group(
                0,
                &group_lesson_indices,
                &atomic_lessons,
                &atomic_slots,
                &teacher_map,
                &config,
                &mut assignment,
                &mut teacher_schedule,
                &mut group_schedule,
            );

            if !solved {
                return Err("No se encontró una asignación factible sin solapamientos para todos los grupos y profesores.".to_string());
            }
        }

        // 5. Merge consecutive 30-min slots of the same subject into 60-min blocks where appropriate
        let merged_classes = self.merge_slots_into_classes(&atomic_lessons, &assignment);

        // 6. Save to database and create DTOs
        let mut solved_dtos = Vec::new();
        for cls in merged_classes {
            let _ = self.db.save_scheduled_class(&cls);

            let start_parts: Vec<&str> = cls.start.split('T').collect();
            let end_parts: Vec<&str> = cls.end.split('T').collect();
            let start_time = if start_parts.len() > 1 { &start_parts[1][..5] } else { "09:00" };
            let end_time = if end_parts.len() > 1 { &end_parts[1][..5] } else { "10:00" };

            let date_parts: Vec<&str> = start_parts[0].split('-').collect();
            let day_num: i32 = date_parts.get(2).and_then(|d| d.parse().ok()).unwrap_or(18);
            let day_of_week = ((day_num - 17).rem_euclid(7)).max(1).min(5);

            solved_dtos.push(SolvedLessonDto {
                id: cls.id,
                subject_id: cls.subject_id,
                group_id: cls.group_id,
                teacher_id: cls.teacher_id,
                day_of_week,
                start_time: start_time.to_string(),
                end_time: end_time.to_string(),
                duration: cls.duration,
                is_pinned: cls.is_pinned,
            });
        }

        if let Some(cb) = on_progress {
            cb(SolverProgressEvent {
                soft_score: 1000,
                is_feasible: true,
                conflicts: Vec::new(),
                solved_lessons: solved_dtos.clone(),
                progress_percent: 100.0,
            });
        }

        Ok(solved_dtos)
    }

    fn backtrack_group(
        &self,
        index: usize,
        group_indices: &[usize],
        lessons: &[AtomicLesson],
        available_slots: &[AtomicSlot],
        teachers: &HashMap<String, Teacher>,
        config: &Config,
        assignment: &mut HashMap<usize, AtomicSlot>,
        teacher_schedule: &mut HashMap<(String, i32, i32), usize>,
        group_schedule: &mut HashMap<(String, i32, i32), usize>,
    ) -> bool {
        if index >= group_indices.len() {
            return true;
        }

        let lesson_idx = group_indices[index];
        let lesson = &lessons[lesson_idx];

        for slot in available_slots {
            if self.is_valid_slot(slot, lesson, teachers, config, teacher_schedule, group_schedule) {
                self.place_lesson(lesson_idx, slot, lesson, assignment, teacher_schedule, group_schedule);

                if self.backtrack_group(index + 1, group_indices, lessons, available_slots, teachers, config, assignment, teacher_schedule, group_schedule) {
                    return true;
                }

                self.remove_lesson(lesson_idx, slot, lesson, assignment, teacher_schedule, group_schedule);
            }
        }

        false
    }

    fn is_valid_slot(
        &self,
        slot: &AtomicSlot,
        lesson: &AtomicLesson,
        teachers: &HashMap<String, Teacher>,
        config: &Config,
        teacher_schedule: &HashMap<(String, i32, i32), usize>,
        group_schedule: &HashMap<(String, i32, i32), usize>,
    ) -> bool {
        // 1. Check teacher availability
        if config.respetar_disponibilidad {
            if let Some(t) = teachers.get(&lesson.teacher_id) {
                if let Some(avail) = &t.availability {
                    for blocked in avail {
                        if blocked.day_of_week == slot.day_of_week {
                            let b_start = self.time_str_to_minutes(&blocked.start_time);
                            let b_end = self.time_str_to_minutes(&blocked.end_time);
                            let s_start = slot.start_minute;
                            let s_end = slot.start_minute + 30;
                            if !(s_end <= b_start || s_start >= b_end) {
                                return false;
                            }
                        }
                    }
                }
            }
        }

        // 2. Check no overlap for teacher or group
        if teacher_schedule.contains_key(&(lesson.teacher_id.clone(), slot.day_of_week, slot.start_minute)) {
            return false;
        }
        if group_schedule.contains_key(&(lesson.group_id.clone(), slot.day_of_week, slot.start_minute)) {
            return false;
        }

        true
    }

    fn place_lesson(
        &self,
        lesson_idx: usize,
        slot: &AtomicSlot,
        lesson: &AtomicLesson,
        assignment: &mut HashMap<usize, AtomicSlot>,
        teacher_schedule: &mut HashMap<(String, i32, i32), usize>,
        group_schedule: &mut HashMap<(String, i32, i32), usize>,
    ) {
        assignment.insert(lesson_idx, slot.clone());
        teacher_schedule.insert((lesson.teacher_id.clone(), slot.day_of_week, slot.start_minute), lesson_idx);
        group_schedule.insert((lesson.group_id.clone(), slot.day_of_week, slot.start_minute), lesson_idx);
    }

    fn remove_lesson(
        &self,
        lesson_idx: usize,
        slot: &AtomicSlot,
        lesson: &AtomicLesson,
        assignment: &mut HashMap<usize, AtomicSlot>,
        teacher_schedule: &mut HashMap<(String, i32, i32), usize>,
        group_schedule: &mut HashMap<(String, i32, i32), usize>,
    ) {
        assignment.remove(&lesson_idx);
        teacher_schedule.remove(&(lesson.teacher_id.clone(), slot.day_of_week, slot.start_minute));
        group_schedule.remove(&(lesson.group_id.clone(), slot.day_of_week, slot.start_minute));
    }

    fn generate_atomic_slots(&self, config: &Config) -> Vec<AtomicSlot> {
        let start_min = self.time_str_to_minutes(&config.hora_inicio_clases);
        let end_min = self.time_str_to_minutes(&config.hora_fin_clases);
        let recess_start = self.time_str_to_minutes(&config.hora_inicio_recreo);
        let recess_end = recess_start + config.duracion_recreo;

        let mut slots = Vec::new();
        for day in 1..=5 {
            let mut current = start_min;
            while current + 30 <= end_min {
                // Check not in recess
                if !(current < recess_end && current + 30 > recess_start) {
                    slots.push(AtomicSlot {
                        day_of_week: day,
                        start_minute: current,
                    });
                }
                current += 30;
            }
        }
        slots
    }

    fn merge_slots_into_classes(
        &self,
        lessons: &[AtomicLesson],
        assignment: &HashMap<usize, AtomicSlot>,
    ) -> Vec<ScheduledClass> {
        // Group atomic lessons by (group_id, teacher_id, subject_id, day_of_week)
        let mut grouped: HashMap<(String, String, String, i32), Vec<i32>> = HashMap::new();
        for lesson in lessons {
            if let Some(slot) = assignment.get(&lesson.lesson_index) {
                let key = (lesson.group_id.clone(), lesson.teacher_id.clone(), lesson.subject_id.clone(), slot.day_of_week);
                grouped.entry(key).or_default().push(slot.start_minute);
            }
        }

        let mut result = Vec::new();
        let mut class_id_counter = 0;

        for ((group_id, teacher_id, subject_id, day_of_week), mut minutes) in grouped {
            minutes.sort();

            let mut i = 0;
            while i < minutes.len() {
                let start_min = minutes[i];
                let mut duration_mins = 30;

                // If next slot is consecutive (start_min + 30), merge into 60-min block
                if i + 1 < minutes.len() && minutes[i + 1] == start_min + 30 {
                    duration_mins = 60;
                    i += 2;
                } else {
                    i += 1;
                }

                let start_time = self.minutes_to_time_str(start_min);
                let end_time = self.minutes_to_time_str(start_min + duration_mins);
                let duration_hours = (duration_mins as f64) / 60.0;
                let id = format!("cls_{}_{}_{}_{}_{}", group_id, subject_id, day_of_week, start_min, class_id_counter);
                class_id_counter += 1;

                result.push(ScheduledClass {
                    id,
                    start: format!("2026-08-{:02}T{}:00", 17 + day_of_week, start_time),
                    end: format!("2026-08-{:02}T{}:00", 17 + day_of_week, end_time),
                    duration: duration_hours,
                    subject_id: subject_id.clone(),
                    group_id: group_id.clone(),
                    teacher_id: teacher_id.clone(),
                    is_pinned: false,
                });
            }
        }

        result
    }

    fn parse_pinned_slots(&self, cls: &ScheduledClass, _config: &Config) -> Option<Vec<AtomicSlot>> {
        let parts: Vec<&str> = cls.start.split('T').collect();
        if parts.len() < 2 { return None; }
        let date_parts: Vec<&str> = parts[0].split('-').collect();
        let time_parts: Vec<&str> = parts[1].split(':').collect();
        if date_parts.len() < 3 || time_parts.len() < 2 { return None; }

        let day_num: i32 = date_parts[2].parse().ok()?;
        let day_of_week = ((day_num - 17).rem_euclid(7)).max(1).min(5);

        let hour: i32 = time_parts[0].parse().ok()?;
        let min: i32 = time_parts[1].parse().ok()?;
        let start_min = hour * 60 + min;
        let duration_min = (cls.duration * 60.0).round() as i32;

        let mut slots = Vec::new();
        let mut curr = start_min;
        while curr < start_min + duration_min {
            slots.push(AtomicSlot {
                day_of_week,
                start_minute: curr,
            });
            curr += 30;
        }

        Some(slots)
    }

    fn time_str_to_minutes(&self, time_str: &str) -> i32 {
        let parts: Vec<&str> = time_str.split(':').collect();
        if parts.len() >= 2 {
            let h: i32 = parts[0].parse().unwrap_or(9);
            let m: i32 = parts[1].parse().unwrap_or(0);
            h * 60 + m
        } else {
            540
        }
    }

    fn minutes_to_time_str(&self, minutes: i32) -> String {
        let h = minutes / 60;
        let m = minutes % 60;
        format!("{:02}:{:02}", h, m)
    }
}
