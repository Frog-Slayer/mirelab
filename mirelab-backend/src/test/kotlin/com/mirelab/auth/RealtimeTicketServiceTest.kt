package com.mirelab.auth

import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@Transactional
class RealtimeTicketServiceTest @Autowired constructor(
    private val service: RealtimeTicketService,
) {
    private val now = Instant.parse("2026-08-22T00:00:00Z")
    private val userId: UUID = UUID.randomUUID()

    @Test
    fun `티켓은 지정한 블록에서 단 한 번만 소비되고 주인을 돌려준다`() {
        val blockId = UUID.randomUUID()
        val issued = service.issue(blockId, userId, now)

        assertEquals(userId, service.consume(blockId, issued.value, now.plusSeconds(1)))
        assertNull(service.consume(blockId, issued.value, now.plusSeconds(2)))
    }

    @Test
    fun `다른 블록이나 만료 뒤에는 소비할 수 없다`() {
        val blockId = UUID.randomUUID()
        val otherBlockId = UUID.randomUUID()
        val wrongBlockTicket = service.issue(blockId, userId, now)
        val expiredTicket = service.issue(blockId, userId, now)
        assertNotEquals(wrongBlockTicket.value, expiredTicket.value)

        assertNull(service.consume(otherBlockId, wrongBlockTicket.value, now.plusSeconds(1)))
        assertEquals(userId, service.consume(blockId, wrongBlockTicket.value, now.plusSeconds(1)))
        assertNull(service.consume(blockId, expiredTicket.value, now.plusSeconds(21)))
    }
}
