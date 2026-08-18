#!/usr/bin/env node

/**
 * EduSchedule Official MCP Server
 * Model Context Protocol integration for AI Agents (Antigravity, Claude, ChatGPT, Cursor, etc.)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.EDUSCHEDULE_API_URL || 'http://127.0.0.1:8080/api/v1';

const server = new McpServer({
    name: 'eduschedule-mcp',
    version: '1.0.0',
    description: 'Model Context Protocol Server for EduSchedule (School Timetable & Teachers Management System)'
});

// Helper for API requests
async function fetchApi(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE}/${endpoint}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const res = await fetch(url, options);
        if (method === 'DELETE') {
            return { success: res.ok, status: res.status };
        }
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`API HTTP ${res.status}: ${errText || res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        throw new Error(`EduSchedule API Error (${url}): ${err.message}`);
    }
}

// -------------------------------------------------------------
// 1. SYSTEM & CONFIG
// -------------------------------------------------------------

server.tool(
    'eduschedule_status',
    'Get EduSchedule system status, backend health, and total counts for courses, teachers, subjects, and scheduled classes.',
    {},
    async () => {
        try {
            const [config, courses, teachers, subjects, schedule] = await Promise.all([
                fetchApi('config').catch(() => null),
                fetchApi('courses').catch(() => []),
                fetchApi('teachers').catch(() => []),
                fetchApi('subjects').catch(() => []),
                fetchApi('scheduledClasses').catch(() => [])
            ]);

            const isConnected = !!config;
            const groupsCount = courses.reduce((sum, c) => sum + (c.groups?.length || 0), 0);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        status: isConnected ? 'online' : 'offline',
                        apiUrl: API_BASE,
                        stats: {
                            coursesCount: courses.length,
                            groupsCount,
                            teachersCount: teachers.length,
                            subjectsCount: subjects.length,
                            scheduledClassesCount: schedule.length
                        },
                        config
                    }, null, 2)
                }]
            };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error checking status: ${err.message}` }], isError: true };
        }
    }
);

server.tool(
    'eduschedule_get_config',
    'Get solver and school configuration parameters.',
    {},
    async () => {
        const config = await fetchApi('config');
        return { content: [{ type: 'text', text: JSON.stringify(config, null, 2) }] };
    }
);

server.tool(
    'eduschedule_save_config',
    'Update solver and school configuration parameters.',
    {
        priorizarTutor: z.boolean().optional().describe('Prioritize class tutor when assigning subjects'),
        tiempoMinimo: z.number().int().optional().describe('Minimum period length in minutes (e.g. 30)'),
        tiempoMaximo: z.number().int().optional().describe('Maximum block length in minutes (e.g. 60)'),
        respetarEspecialidad: z.boolean().optional().describe('Strictly enforce teacher subject specializations'),
        respetarLimiteHoras: z.boolean().optional().describe('Strictly enforce teacher weekly maximum teaching hours'),
        horaInicioClases: z.string().optional().describe('Start of school day (HH:mm, e.g. 09:00)'),
        horaFinClases: z.string().optional().describe('End of school day (HH:mm, e.g. 15:00)'),
        horaInicioRecreo: z.string().optional().describe('Start of recess (HH:mm, e.g. 12:00)'),
        duracionRecreo: z.number().int().optional().describe('Recess duration in minutes (e.g. 30)')
    },
    async (args) => {
        const current = await fetchApi('config');
        const updated = { ...current, ...args };
        const result = await fetchApi('config', 'PUT', updated);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

// -------------------------------------------------------------
// 2. DIAGNOSTICS & VIABILITY
// -------------------------------------------------------------

server.tool(
    'eduschedule_check_viability',
    'Run EduSchedule viability prevalidation diagnosis (pin conflicts, group capacity, subject specialties coverage, teacher workload excesses, and total school balance).',
    {},
    async () => {
        try {
            const diagnosis = await fetchApi('prevalidation');
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(diagnosis, null, 2)
                }]
            };
        } catch (err) {
            return { content: [{ type: 'text', text: `Error running prevalidation: ${err.message}` }], isError: true };
        }
    }
);

// -------------------------------------------------------------
// 3. COURSES & GROUPS
// -------------------------------------------------------------

server.tool(
    'eduschedule_list_courses',
    'List all courses with their sub-groups, tutors, and subject assignments in Reparto Docente.',
    {},
    async () => {
        const courses = await fetchApi('courses');
        return { content: [{ type: 'text', text: JSON.stringify(courses, null, 2) }] };
    }
);

server.tool(
    'eduschedule_save_course',
    'Create or update a course with its groups.',
    {
        id: z.string().optional().describe('Course ID (omit to create a new course)'),
        name: z.string().describe('Course name (e.g. "1º Primaria", "Infantil 3 Años")'),
        groups: z.array(z.object({
            id: z.string().optional().describe('Group ID'),
            name: z.string().describe('Group name (e.g. "A", "B")'),
            tutorId: z.string().describe('Teacher ID assigned as group tutor'),
            assignments: z.record(z.string()).optional().describe('Map of SubjectId -> TeacherId')
        })).optional().describe('List of groups within this course')
    },
    async (args) => {
        const method = args.id ? 'PUT' : 'POST';
        const result = await fetchApi('courses', method, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'eduschedule_delete_course',
    'Delete a course by ID.',
    { id: z.string().describe('Course ID to delete') },
    async ({ id }) => {
        const result = await fetchApi(`courses/${id}`, 'DELETE');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

// -------------------------------------------------------------
// 4. TEACHERS
// -------------------------------------------------------------

server.tool(
    'eduschedule_list_teachers',
    'List all teachers with their max teaching hours, colors, specialty subject IDs, and availability grid.',
    {},
    async () => {
        const teachers = await fetchApi('teachers');
        return { content: [{ type: 'text', text: JSON.stringify(teachers, null, 2) }] };
    }
);

server.tool(
    'eduschedule_save_teacher',
    'Create or update a teacher profile.',
    {
        id: z.string().optional().describe('Teacher ID (omit to create a new teacher)'),
        name: z.string().describe('Teacher full name'),
        maxHours: z.number().describe('Maximum weekly teaching hours (e.g. 22.5)'),
        color: z.string().optional().describe('Hex color for schedule display (e.g. "#ef4444")'),
        subjects: z.array(z.string()).optional().describe('List of Subject IDs the teacher is qualified to teach'),
        availability: z.array(z.object({
            day: z.string().describe('Day of week (MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY)'),
            start: z.string().describe('Start time HH:mm (e.g. "09:00")'),
            end: z.string().describe('End time HH:mm (e.g. "14:00")'),
            available: z.boolean().describe('Whether teacher is available during this slot')
        })).optional().describe('Teacher weekly availability preferences')
    },
    async (args) => {
        const method = args.id ? 'PUT' : 'POST';
        const result = await fetchApi('teachers', method, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'eduschedule_delete_teacher',
    'Delete a teacher by ID.',
    { id: z.string().describe('Teacher ID to delete') },
    async ({ id }) => {
        const result = await fetchApi(`teachers/${id}`, 'DELETE');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

// -------------------------------------------------------------
// 5. SUBJECTS
// -------------------------------------------------------------

server.tool(
    'eduschedule_list_subjects',
    'List all subjects with their hours, course IDs, and weekly duration.',
    {},
    async () => {
        const subjects = await fetchApi('subjects');
        return { content: [{ type: 'text', text: JSON.stringify(subjects, null, 2) }] };
    }
);

server.tool(
    'eduschedule_save_subject',
    'Create or update a subject.',
    {
        id: z.string().optional().describe('Subject ID (omit to create new subject)'),
        name: z.string().describe('Subject name (e.g. "Matemáticas", "Lengua", "Inglés")'),
        hours: z.number().describe('Weekly teaching hours (e.g. 5.0, 2.5)'),
        courseId: z.string().describe('Course ID to which this subject belongs')
    },
    async (args) => {
        const method = args.id ? 'PUT' : 'POST';
        const result = await fetchApi('subjects', method, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'eduschedule_delete_subject',
    'Delete a subject by ID.',
    { id: z.string().describe('Subject ID to delete') },
    async ({ id }) => {
        const result = await fetchApi(`subjects/${id}`, 'DELETE');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

// -------------------------------------------------------------
// 6. ASSIGNMENTS (REPARTO DOCENTE)
// -------------------------------------------------------------

server.tool(
    'eduschedule_update_assignment',
    'Assign a teacher to a specific subject for a given group in Reparto Docente.',
    {
        courseId: z.string().describe('Course ID'),
        groupId: z.string().describe('Group ID'),
        subjectId: z.string().describe('Subject ID'),
        teacherId: z.string().describe('Teacher ID to assign (pass "" to unassign)')
    },
    async ({ courseId, groupId, subjectId, teacherId }) => {
        const courses = await fetchApi('courses');
        const course = courses.find(c => c.id.toString() === courseId.toString());
        if (!course) throw new Error(`Course ID ${courseId} not found`);

        const group = course.groups.find(g => g.id.toString() === groupId.toString());
        if (!group) throw new Error(`Group ID ${groupId} not found in course ${course.name}`);

        group.assignments = group.assignments || {};
        if (teacherId === '') {
            delete group.assignments[subjectId];
        } else {
            group.assignments[subjectId] = teacherId;
        }

        const result = await fetchApi(`courses/${courseId}/groups`, 'PUT', course.groups);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

// -------------------------------------------------------------
// 7. SCHEDULE & TIMETABLE
// -------------------------------------------------------------

server.tool(
    'eduschedule_get_schedule',
    'Get scheduled class slots (optionally filter by teacherId, groupId, or isPinned).',
    {
        teacherId: z.string().optional().describe('Filter by teacher ID'),
        groupId: z.string().optional().describe('Filter by group ID'),
        isPinned: z.boolean().optional().describe('Filter only pinned/unpinned classes')
    },
    async ({ teacherId, groupId, isPinned }) => {
        let schedule = await fetchApi('scheduledClasses');
        if (teacherId) schedule = schedule.filter(c => c.teacherId?.toString() === teacherId.toString());
        if (groupId) schedule = schedule.filter(c => c.groupId?.toString() === groupId.toString());
        if (isPinned !== undefined) schedule = schedule.filter(c => c.isPinned === isPinned);
        return { content: [{ type: 'text', text: JSON.stringify(schedule, null, 2) }] };
    }
);

server.tool(
    'eduschedule_save_class',
    'Schedule or update a class slot in the timetable (supports pinning with isPinned: true).',
    {
        id: z.string().optional().describe('Class slot ID (omit to create new slot)'),
        subjectId: z.string().describe('Subject ID'),
        teacherId: z.string().describe('Teacher ID'),
        groupId: z.string().describe('Group ID'),
        start: z.string().describe('ISO Datetime start (e.g. "2026-08-17T09:00:00")'),
        end: z.string().describe('ISO Datetime end (e.g. "2026-08-17T09:30:00")'),
        duration: z.number().describe('Duration in hours (e.g. 0.5 for 30m, 1.0 for 1h)'),
        isPinned: z.boolean().optional().describe('Whether this class is manually locked/pinned (PIN 📌)')
    },
    async (args) => {
        const method = args.id ? 'PUT' : 'POST';
        const result = await fetchApi('scheduledClasses', method, args);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'eduschedule_delete_class',
    'Delete a specific scheduled class slot from the timetable.',
    { id: z.string().describe('Class ID to remove') },
    async ({ id }) => {
        const result = await fetchApi(`scheduledClasses/${id}`, 'DELETE');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

server.tool(
    'eduschedule_clear_group_schedule',
    'Clear all scheduled classes for a specific group.',
    { groupId: z.string().describe('Group ID to clear schedule for') },
    async ({ groupId }) => {
        const result = await fetchApi(`scheduledClasses/group/${groupId}`, 'DELETE');
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
);

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('EduSchedule MCP Server is running over Stdio transport.');
}

main().catch(err => {
    console.error('Fatal MCP Server Error:', err);
    process.exit(1);
});
