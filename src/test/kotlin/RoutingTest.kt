package com.colegio

import kotlin.test.Test
import kotlin.test.assertEquals

class RoutingTest {

    @Test
    fun `parseId - parses pure numeric strings correctly`() {
        assertEquals(123, parseId("123"))
        assertEquals(0, parseId("0"))
        assertEquals(42, parseId("42"))
    }

    @Test
    fun `parseId - parses prefixed numeric strings correctly`() {
        assertEquals(45, parseId("prof-45"))
        assertEquals(12, parseId("course-12"))
        assertEquals(99, parseId("subject-99"))
        assertEquals(5, parseId("g-5"))
        assertEquals(88, parseId("TEACHER-88"))
        assertEquals(3, parseId("Course-3"))
    }

    @Test
    fun `parseId - returns default value 1 for non-numeric or invalid inputs`() {
        assertEquals(1, parseId(""))
        assertEquals(1, parseId("abc"))
        assertEquals(1, parseId("prof-"))
        assertEquals(1, parseId("prof-xyz"))
        assertEquals(1, parseId("   "))
    }

    @Test
    fun `parseId - handles edge cases like overflow and unexpected prefix formats`() {
        // Integer overflow
        assertEquals(1, parseId("9999999999999999999"))
        assertEquals(1, parseId("prof-9999999999999999999"))

        // Prefix non-matching patterns
        assertEquals(1, parseId("123-abc"))
        assertEquals(1, parseId("prof_123"))
        assertEquals(1, parseId("_prefix-123"))
    }
}
