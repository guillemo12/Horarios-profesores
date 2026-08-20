import type { ApiService } from './api';

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
    minimizarAsignaturasDistintas?: boolean;
    minimizarAsignaturasPuntos?: number;
    limiteTiempoSegundos?: number;
    tiempoEstancamientoSegundos?: number;
    
    // Rango horario y recreo
    horaInicioClases: string;
    horaFinClases: string;
    horaInicioRecreo: string;
    duracionRecreo: number;

    // Reglas duras
    respetarEspecialidad: boolean;
    respetarLimiteHoras: boolean;
    respetarDisponibilidad: boolean;
}

export interface Database {
    subjects: Subject[];
    teachers: Teacher[];
    courses: Course[];
    scheduledClasses: ScheduledClass[];
}

export type WsCallback = (data?: any) => void;

export interface MergedDisplayEvent {
    id: string;
    mergedIds: string[];
    calendarId: string;
    title: string;
    body: string;
    start: Date | string;
    end: Date | string;
    duration: number;
    isReadOnly: boolean;
    isPinned: boolean;
    backgroundColor: string;
    color: string;
    customStyle?: Record<string, unknown>;
    raw: {
        subjectId: string;
        teacherId: string;
        groupId: string;
    };
}

export interface TuiCalendarInstance {
    clear: () => void;
    render: () => void;
    createEvents: (events: MergedDisplayEvent[] | unknown[]) => void;
    getDateRangeStart: () => { toDate?: () => Date } | Date;
    getDateRangeEnd: () => { toDate?: () => Date } | Date;
    clearGridSelections: () => void;
    on: (event: string, handler: (info: any) => void) => void;
}

export interface AppDataState {
    API: ApiService;
    subjects: Subject[];
    teachers: Teacher[];
    courses: Course[];
    scheduledClasses: ScheduledClass[];
    calendarInstance: TuiCalendarInstance | null;
    currentEventContext?: unknown;
    currentMergedEvents?: MergedDisplayEvent[];
    colorMode?: 'teacher' | 'subject';
    config?: Configuracion;
    currentCourseId?: string | null;
}

export interface PrevalidationCheck {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    details: string[];
}

export interface PrevalidationResult {
    viable: boolean;
    checks: PrevalidationCheck[];
}
