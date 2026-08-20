#[cfg(test)]
mod native_tests {
    use crate::db::Database;
    use crate::models::{Course, Group, ScheduledClass, Subject, Teacher, TeacherAvailability};
    use crate::solver::ScheduleSolver;
    use std::collections::HashMap;

    fn create_in_memory_db() -> Database {
        let temp_dir = tempfile::tempdir().expect("Failed to create tempdir");
        let db_path = temp_dir.path().join("test_eduschedule.db");
        Database::init(Some(&db_path)).expect("Failed to init in-memory db")
    }

    // -------------------------------------------------------------
    // DB & SEEDING TESTS
    // -------------------------------------------------------------
    #[test]
    fn test_db_initialization_and_seeding_happy_path() {
        let db = create_in_memory_db();
        let teachers = db.get_teachers().expect("Failed to get teachers");
        let courses = db.get_courses().expect("Failed to get courses");
        let subjects = db.get_subjects().expect("Failed to get subjects");
        let config = db.get_config().expect("Failed to get config");

        assert!(!teachers.is_empty(), "Database should have seeded teachers");
        assert!(!courses.is_empty(), "Database should have seeded courses");
        assert!(!subjects.is_empty(), "Database should have seeded subjects");
        assert_eq!(config.tiempo_minimo, 30);
    }

    #[test]
    fn test_db_custom_path_creation_edge_case() {
        let temp_dir = tempfile::tempdir().expect("Failed to create tempdir");
        let nested_path = temp_dir.path().join("nested").join("deep").join("custom.db");
        let db = Database::init(Some(&nested_path)).expect("Failed to init db in nested directory");
        assert!(nested_path.exists(), "Nested database file should be created");
        assert_eq!(db.get_path(), nested_path);
    }

    // -------------------------------------------------------------
    // TEACHER CRUD TESTS
    // -------------------------------------------------------------
    #[test]
    fn test_teacher_crud_happy_path() {
        let db = create_in_memory_db();
        let new_teacher = Teacher {
            id: "".to_string(),
            name: "Profesor Prueba".to_string(),
            max_hours: 20.0,
            color: "#10b981".to_string(),
            subjects: vec!["1".to_string()],
            availability: Some(vec![TeacherAvailability {
                day_of_week: 1,
                start_time: "09:00".to_string(),
                end_time: "11:00".to_string(),
            }]),
        };

        let inserted_id = db.save_teacher(&new_teacher).expect("Failed to insert teacher");
        assert!(!inserted_id.is_empty());

        let teachers = db.get_teachers().expect("Failed to fetch teachers");
        let found = teachers.iter().find(|t| t.id == inserted_id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Profesor Prueba");
        assert_eq!(found.unwrap().max_hours, 20.0);

        let deleted = db.delete_teacher(&inserted_id).expect("Failed to delete teacher");
        assert!(deleted);
    }

    #[test]
    fn test_teacher_crud_edge_cases() {
        let db = create_in_memory_db();
        let deleted_non_existent = db.delete_teacher("999999").expect("Query failed");
        assert!(!deleted_non_existent, "Deleting non-existent teacher should return false");
    }

    // -------------------------------------------------------------
    // SUBJECT CRUD TESTS
    // -------------------------------------------------------------
    #[test]
    fn test_subject_crud_happy_path() {
        let db = create_in_memory_db();
        let new_subject = Subject {
            id: "".to_string(),
            name: "Física Cuántica".to_string(),
            hours: 3.0,
            course_id: "1".to_string(),
            teachers: Some(vec!["1".to_string()]),
        };

        let inserted_id = db.save_subject(&new_subject).expect("Failed to insert subject");
        assert!(!inserted_id.is_empty());

        let subjects = db.get_subjects().expect("Failed to fetch subjects");
        let found = subjects.iter().find(|s| s.id == inserted_id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Física Cuántica");
        assert_eq!(found.unwrap().hours, 3.0);

        let deleted = db.delete_subject(&inserted_id).expect("Failed to delete subject");
        assert!(deleted);
    }

    #[test]
    fn test_subject_crud_invalid_id_edge_case() {
        let db = create_in_memory_db();
        let deleted = db.delete_subject("0").expect("Query should execute");
        assert!(!deleted, "Deleting subject with id 0 should return false");
    }

    // -------------------------------------------------------------
    // COURSE & ASSIGNMENT TESTS
    // -------------------------------------------------------------
    #[test]
    fn test_course_and_assignments_happy_path() {
        let db = create_in_memory_db();
        let mut assignments = HashMap::new();
        assignments.insert("1".to_string(), "2".to_string());

        let new_course = Course {
            id: "".to_string(),
            name: "1º Bachillerato".to_string(),
            subjects: vec!["1".to_string()],
            groups: vec![Group {
                id: "".to_string(),
                name: "A".to_string(),
                tutor_id: Some("1".to_string()),
                assignments,
            }],
        };

        let course_id = db.save_course(&new_course).expect("Failed to save course");
        assert!(!course_id.is_empty());

        let courses = db.get_courses().expect("Failed to fetch courses");
        let found = courses.iter().find(|c| c.id == course_id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "1º Bachillerato");
        assert_eq!(found.unwrap().groups.len(), 1);

        // Update single assignment
        let group_id = &found.unwrap().groups[0].id;
        db.update_assignment(&course_id, group_id, "1", "3").expect("Failed to update assignment");

        let updated_courses = db.get_courses().expect("Failed to fetch courses");
        let updated_found = updated_courses.iter().find(|c| c.id == course_id).unwrap();
        assert_eq!(updated_found.groups[0].assignments.get("1").unwrap(), "3");
    }

    #[test]
    fn test_course_and_assignments_edge_cases() {
        let db = create_in_memory_db();
        let empty_course = Course {
            id: "".to_string(),
            name: "Curso Vacío".to_string(),
            subjects: vec![],
            groups: vec![],
        };

        let course_id = db.save_course(&empty_course).expect("Failed to save empty course");
        let deleted = db.delete_course(&course_id).expect("Failed to delete course");
        assert!(deleted);
    }

    // -------------------------------------------------------------
    // SCHEDULE PIN & CLEAR TESTS
    // -------------------------------------------------------------
    #[test]
    fn test_schedule_pin_and_clear_happy_path() {
        let db = create_in_memory_db();
        let normal_class = ScheduledClass {
            id: "cls_normal".to_string(),
            start: "2026-08-18T09:00:00".to_string(),
            end: "2026-08-18T10:00:00".to_string(),
            duration: 1.0,
            subject_id: "1".to_string(),
            group_id: "1".to_string(),
            teacher_id: "1".to_string(),
            is_pinned: false,
        };
        let pinned_class = ScheduledClass {
            id: "cls_pinned".to_string(),
            start: "2026-08-18T10:00:00".to_string(),
            end: "2026-08-18T11:00:00".to_string(),
            duration: 1.0,
            subject_id: "2".to_string(),
            group_id: "1".to_string(),
            teacher_id: "2".to_string(),
            is_pinned: true,
        };

        db.save_scheduled_class(&normal_class).expect("Failed to save normal class");
        db.save_scheduled_class(&pinned_class).expect("Failed to save pinned class");

        let classes_before = db.get_scheduled_classes().expect("Failed to get classes");
        assert_eq!(classes_before.len(), 2);

        // Clear schedule: pinned classes must survive
        db.clear_schedule().expect("Failed to clear schedule");
        let classes_after = db.get_scheduled_classes().expect("Failed to get classes");
        assert_eq!(classes_after.len(), 1);
        assert_eq!(classes_after[0].id, "cls_pinned");
        assert!(classes_after[0].is_pinned);
    }

    #[test]
    fn test_schedule_pin_toggle_edge_case() {
        let db = create_in_memory_db();
        let test_class = ScheduledClass {
            id: "cls_toggle".to_string(),
            start: "2026-08-18T09:00:00".to_string(),
            end: "2026-08-18T10:00:00".to_string(),
            duration: 1.0,
            subject_id: "1".to_string(),
            group_id: "1".to_string(),
            teacher_id: "1".to_string(),
            is_pinned: false,
        };
        db.save_scheduled_class(&test_class).expect("Save class failed");

        let toggled = db.toggle_class_pin("cls_toggle", true).expect("Toggle pin failed");
        assert!(toggled);

        let classes = db.get_scheduled_classes().expect("Get classes failed");
        assert!(classes.iter().find(|c| c.id == "cls_toggle").unwrap().is_pinned);
    }

    // -------------------------------------------------------------
    // SOLVER TESTS
    // -------------------------------------------------------------
    #[test]
    fn test_solver_happy_path() {
        let db = create_in_memory_db();
        let solver = ScheduleSolver::new(db.clone());

        let result = solver.solve::<fn(_)>(None);
        assert!(result.is_ok(), "Solver should find a valid schedule for seeded dataset: {:?}", result.err());

        let solved_classes = result.unwrap();
        assert!(!solved_classes.is_empty(), "Solver should have generated scheduled lessons");

        // Verify no overlapping classes for the same teacher or group in the same slot
        let mut teacher_slots = HashMap::new();
        let mut group_slots = HashMap::new();

        for lesson in &solved_classes {
            let t_key = (lesson.teacher_id.clone(), lesson.day_of_week, lesson.start_time.clone());
            let g_key = (lesson.group_id.clone(), lesson.day_of_week, lesson.start_time.clone());

            assert!(!teacher_slots.contains_key(&t_key), "Teacher overlap detected at {:?}", t_key);
            assert!(!group_slots.contains_key(&g_key), "Group overlap detected at {:?}", g_key);

            teacher_slots.insert(t_key, true);
            group_slots.insert(g_key, true);
        }
    }

    #[test]
    fn test_solver_empty_dataset_edge_case() {
        let temp_dir = tempfile::tempdir().expect("Failed to create tempdir");
        let db_path = temp_dir.path().join("empty.db");
        let db = Database::init(Some(&db_path)).expect("Failed to init db");

        // Delete all courses
        let courses = db.get_courses().unwrap();
        for c in courses {
            db.delete_course(&c.id).unwrap();
        }

        let solver = ScheduleSolver::new(db);
        let result = solver.solve::<fn(_)>(None);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty(), "Empty dataset should produce empty schedule without errors");
    }
}
