import { Subject, Teacher, Course, CourseGroup, ScheduledClass, Configuracion, PrevalidationResult } from './types';

export class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = '/api/v1'; 
    }

    private async _fetch<T>(endpoint: string, method: string = 'GET', payload: any = null): Promise<T> {
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

    async getConfig(): Promise<Configuracion> { return this._fetch<Configuracion>('config'); }
    async saveConfig(c: Configuracion): Promise<Configuracion> { return this._fetch<Configuracion>('config', 'PUT', c); }

    async getSubjects(): Promise<Subject[]> { return this._fetch<Subject[]>('subjects'); }
    async saveSubject(s: Partial<Subject>): Promise<Subject> { return s.id ? this._fetch<Subject>('subjects', 'PUT', s) : this._fetch<Subject>('subjects', 'POST', s); }
    async deleteSubject(id: string): Promise<{success: boolean}> { return this._fetch<{success: boolean}>(`subjects/${id}`, 'DELETE'); }

    async getTeachers(): Promise<Teacher[]> { return this._fetch<Teacher[]>('teachers'); }
    async saveTeacher(t: Partial<Teacher>): Promise<Teacher> { return t.id ? this._fetch<Teacher>('teachers', 'PUT', t) : this._fetch<Teacher>('teachers', 'POST', t); }
    async deleteTeacher(id: string): Promise<{success: boolean}> { return this._fetch<{success: boolean}>(`teachers/${id}`, 'DELETE'); }

    async getCourses(): Promise<Course[]> { return this._fetch<Course[]>('courses'); }
    async saveCourse(c: Partial<Course>): Promise<Course> { return c.id ? this._fetch<Course>('courses', 'PUT', c) : this._fetch<Course>('courses', 'POST', c); }
    async deleteCourse(id: string): Promise<{success: boolean}> { return this._fetch<{success: boolean}>(`courses/${id}`, 'DELETE'); }
    
    async updateCourseGroup(courseId: string, newGroupsArray: CourseGroup[]): Promise<Course> {
        return this._fetch<Course>(`courses/${courseId}/groups`, 'PUT', newGroupsArray);
    }

    async getSchedule(): Promise<ScheduledClass[]> { return this._fetch<ScheduledClass[]>('scheduledClasses'); }
    async saveClass(cls: ScheduledClass): Promise<ScheduledClass> { return this._fetch<ScheduledClass>('scheduledClasses', 'POST', cls); }
    async updateClass(cls: ScheduledClass): Promise<ScheduledClass> { return this._fetch<ScheduledClass>('scheduledClasses', 'PUT', cls); }
    async deleteClass(id: string): Promise<{success: boolean}> { return this._fetch<{success: boolean}>(`scheduledClasses/${id}`, 'DELETE'); }
    async deleteGroupSchedule(groupId: string): Promise<{success: boolean}> { return this._fetch<{success: boolean}>(`scheduledClasses/group/${groupId}`, 'DELETE'); }

    async getPrevalidation(): Promise<PrevalidationResult> { return this._fetch<PrevalidationResult>('prevalidation'); }
}
