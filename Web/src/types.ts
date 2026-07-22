export interface Subject {
    id: string;
    name: string;
    hours: number;
    courseId?: string;
    teachers?: string[];
}

export interface TeacherAvailability {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export interface Teacher {
    id: string;
    name: string;
    maxHours: number;
    color: string;
    subjects: string[];
    availability?: TeacherAvailability[];
}

export interface CourseGroup {
    id: string;
    name: string;
    tutorId: string;
    assignments: Record<string, string>; // subjectId -> teacherId
}

export interface Course {
    id: string;
    name: string;
    subjects: string[];
    groups: CourseGroup[];
}

export interface ScheduledClass {
    id: string;
    start: Date | string;
    end: Date | string;
    duration: number;
    subjectId: string;
    groupId: string;
    teacherId: string;
    isPinned: boolean;
}

export interface Configuracion {
    priorizarTutor: boolean;
    tiempoMinimo: number;
    tiempoMaximo: number;
    minutosMaximosProfesor: number;
    priorizarTutorPuntos: number;
    fomentarBloques60Puntos: number;
    evitarHuecosPuntos: number;
    compactarTempranoPuntos: number;
}

export interface Database {
    subjects: Subject[];
    teachers: Teacher[];
    courses: Course[];
    scheduledClasses: ScheduledClass[];
}

export type WsCallback = (data?: any) => void;

export interface AppDataState {
    API: any;
    WS: any;
    subjects: Subject[];
    teachers: Teacher[];
    courses: Course[];
    scheduledClasses: ScheduledClass[];
    calendarInstance: any;
    currentEventContext: any;
    config?: Configuracion;
}
