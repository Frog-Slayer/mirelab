package com.mirelab.domain.user

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class UsernamePolicyTest {
    @Test
    fun `username은 공백과 대문자를 정규화한다`() {
        assertEquals("yeongseo", UsernamePolicy.normalize("  YeongSeo "))
    }

    @Test
    fun `예약어와 잘못된 형식은 거절한다`() {
        assertFalse(UsernamePolicy.isAllowed("me"))
        assertFalse(UsernamePolicy.isAllowed("가나다"))
        assertTrue(UsernamePolicy.isAllowed("yeongseo_2"))
    }
}
