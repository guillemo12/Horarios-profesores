import { Subject, Teacher, Course, CourseGroup, ScheduledClass, Configuracion, PrevalidationResult } from './types';

export class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = '/api/v1';
    }

    public isTauri(): boolean {
        return typeof window !== 'undefined' && (
            !!(window as any).__TAURI_INTERNALS__ || 
            !!(window as any).__TAURI__
        );
    }

    private async invokeNative<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
        const w = window as any;
        if (w.__TAURI__?.core?.invoke) {
            return await w.__TAURI__.core.invoke(cmd, args);
        }
        if (w.__TAURI_INTERNALS__?.invoke) {
            return await w.__TAURI_INTERNALS__.invoke(cmd, args);
        }
        throw new Error('Tauri IPC invoke not found in window');
    }

    private async _fetch<T>(endpoint: string, method: string = 'GET', payload: unknown = null): Promise<T> {
        const url = `${this.baseUrl}/${endpoint}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (payload) {
            options.body = JSON.stringify(payload);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (method === 'DELETE') {
            return { success: true } as unknown as T;
        }
        return await response.json();
    }

    async getConfig(): Promise<Configuracion> {
        if (this.isTauri()) {
            return await this.invokeNative<Configuracion>('get_config');
        }
        return this._fetch<Configuracion>('config');
    }

    async saveConfig(c: Configuracion): Promise<Configuracion> {
        if (this.isTauri()) {
            await this.invokeNative<void>('save_config', { config: c });
            return c;
        }
        return this._fetch<Configuracion>('config', 'PUT', c);
    }

    async getSubjects(): Promise<Subject[]> {
        if (this.isTauri()) {
            return await this.invokeNative<Subject[]>('get_subjects');
        }
        return this._fetch<Subject[]>('subjects');
    }

    async saveSubject(s: Partial<Subject>): Promise<Subject> {
        if (this.isTauri()) {
            const subjectPayload: Subject = {
                id: s.id || '',
                name: s.name || '',
                hours: s.hours || 0,
                courseId: s.courseId || '1',
                teachers: s.teachers || []
            };
            const id = await this.invokeNative<string>('save_subject', { subject: subjectPayload });
            subjectPayload.id = id;
            return subjectPayload;
        }
        return s.id ? this._fetch<Subject>('subjects', 'PUT', s) : this._fetch<Subject>('subjects', 'POST', s);
    }

    async deleteSubject(id: string): Promise<{success: boolean}> {
        if (this.isTauri()) {
            const ok = await this.invokeNative<boolean>('delete_subject', { id });
            return { success: ok };
        }
        return this._fetch<{success: boolean}>(`subjects/${id}`, 'DELETE');
    }

    async getTeachers(): Promise<Teacher[]> {
        if (this.isTauri()) {
            return await this.invokeNative<Teacher[]>('get_teachers');
        }
        return this._fetch<Teacher[]>('teachers');
    }

    async saveTeacher(t: Partial<Teacher>): Promise<Teacher> {
        if (this.isTauri()) {
            const teacherPayload: Teacher = {
                id: t.id || '',
                name: t.name || '',
                maxHours: t.maxHours || 25,
                color: t.color || '#4f46e5',
                subjects: t.subjects || [],
                availability: t.availability || []
            };
            const id = await this.invokeNative<string>('save_teacher', { teacher: teacherPayload });
            teacherPayload.id = id;
            return teacherPayload;
        }
        return t.id ? this._fetch<Teacher>('teachers', 'PUT', t) : this._fetch<Teacher>('teachers', 'POST', t);
    }

    async deleteTeacher(id: string): Promise<{success: boolean}> {
        if (this.isTauri()) {
            const ok = await this.invokeNative<boolean>('delete_teacher', { id });
            return { success: ok };
        }
        return this._fetch<{success: boolean}>(`teachers/${id}`, 'DELETE');
    }

    async getCourses(): Promise<Course[]> {
        if (this.isTauri()) {
            return await this.invokeNative<Course[]>('get_courses');
        }
        return this._fetch<Course[]>('courses');
    }

    async saveCourse(c: Partial<Course>): Promise<Course> {
        if (this.isTauri()) {
            const coursePayload: Course = {
                id: c.id || '',
                name: c.name || '',
                subjects: c.subjects || [],
                groups: c.groups || []
            };
            const id = await this.invokeNative<string>('save_course', { course: coursePayload });
            coursePayload.id = id;
            return coursePayload;
        }
        return c.id ? this._fetch<Course>('courses', 'PUT', c) : this._fetch<Course>('courses', 'POST', c);
    }

    async deleteCourse(id: string): Promise<{success: boolean}> {
        if (this.isTauri()) {
            const ok = await this.invokeNative<boolean>('delete_course', { id });
            return { success: ok };
        }
        return this._fetch<{success: boolean}>(`courses/${id}`, 'DELETE');
    }
    
    async updateCourseGroup(courseId: string, newGroupsArray: CourseGroup[]): Promise<Course> {
        if (this.isTauri()) {
            const courses = await this.getCourses();
            const course = courses.find(c => c.id === courseId);
            if (course) {
                course.groups = newGroupsArray;
                await this.saveCourse(course);
                return course;
            }
        }
        return this._fetch<Course>(`courses/${courseId}/groups`, 'PUT', newGroupsArray);
    }

    async getSchedule(): Promise<ScheduledClass[]> {
        if (this.isTauri()) {
            return await this.invokeNative<ScheduledClass[]>('get_schedule');
        }
        return this._fetch<ScheduledClass[]>('scheduledClasses');
    }

    async saveClass(cls: ScheduledClass): Promise<ScheduledClass> {
        if (this.isTauri()) {
            await this.invokeNative<void>('save_class', { classItem: cls });
            return cls;
        }
        return this._fetch<ScheduledClass>('scheduledClasses', 'POST', cls);
    }

    async updateClass(cls: ScheduledClass): Promise<ScheduledClass> {
        if (this.isTauri()) {
            await this.invokeNative<void>('save_class', { classItem: cls });
            return cls;
        }
        return this._fetch<ScheduledClass>('scheduledClasses', 'PUT', cls);
    }

    async deleteClass(id: string): Promise<{success: boolean}> {
        if (this.isTauri()) {
            const ok = await this.invokeNative<boolean>('delete_class', { id });
            return { success: ok };
        }
        return this._fetch<{success: boolean}>(`scheduledClasses/${id}`, 'DELETE');
    }

    async deleteGroupSchedule(groupId: string): Promise<{success: boolean}> {
        if (this.isTauri()) {
            await this.invokeNative<void>('clear_group_schedule', { groupId });
            return { success: true };
        }
        return this._fetch<{success: boolean}>(`scheduledClasses/group/${groupId}`, 'DELETE');
    }

    async getPrevalidation(): Promise<PrevalidationResult> {
        if (this.isTauri()) {
            return await this.invokeNative<PrevalidationResult>('run_prevalidation');
        }
        return this._fetch<PrevalidationResult>('prevalidation');
    }

    async startSolver(): Promise<any[]> {
        if (this.isTauri()) {
            return await this.invokeNative<any[]>('start_solver');
        }
        throw new Error('Solver can only be invoked in native desktop mode');
    }
}
