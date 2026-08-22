package com.mirelab.application.slot

import jakarta.annotation.PreDestroy
import java.time.Duration
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.springframework.stereotype.Component
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

/**
 * "이 작품의 칸 값이 바뀌었다"를 보고 있는 사람들에게 즉시 밀어주는 곳.
 *
 * 별점 공개는 다 같이 "하나, 둘, 셋" 하고 여는 순간이 전부라, 폴링으로 몇 초씩 밀리면
 * 그 순간이 통째로 흐트러진다.
 *
 * 신호에는 값을 싣지 않는다 — 무엇이 보이는지는 보는 사람마다 다르고([SlotService] 의
 * visibility·published 판정), 그 판정을 여기서 한 번 더 하면 두 곳이 어긋난다. 그래서
 * "바뀌었으니 다시 받아가라"만 보내고 실제 내용은 각자 평소 경로로 받아가게 둔다.
 *
 * 구독자는 이 JVM 의 메모리에만 있다. 백엔드를 여러 대로 늘리면 인스턴스 간 전파가
 * 따로 필요하다 — 지금은 한 대라 여기서 끝난다.
 */
@Component
class WorkSlotEventPublisher {
    private val rooms = ConcurrentHashMap<UUID, MutableSet<SseEmitter>>()

    private val keepAlive = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "work-slot-events-keep-alive").apply { isDaemon = true }
    }

    init {
        keepAlive.scheduleAtFixedRate(
            ::heartbeat,
            HEARTBEAT.seconds,
            HEARTBEAT.seconds,
            TimeUnit.SECONDS,
        )
    }

    fun subscribe(workId: UUID): SseEmitter {
        val emitter = SseEmitter(STREAM_TIMEOUT.toMillis())
        // 방에 넣는 일은 반드시 맵 갱신과 한 덩어리여야 한다 — 밖에서 add 하면 그 찰나에
        // 마지막 구독자가 빠지면서 방이 통째로 치워질 수 있고, 그러면 이 접속은 아무 신호도
        // 못 받는 유령이 된다.
        rooms.compute(workId) { _, room ->
            (room ?: ConcurrentHashMap.newKeySet()).apply { add(emitter) }
        }
        emitter.onCompletion { drop(workId, emitter) }
        emitter.onTimeout { emitter.complete() }
        emitter.onError { emitter.complete() }
        // 첫 바이트를 바로 흘려보낸다 — 이게 없으면 프록시가 응답 헤더째 붙들고 있어서
        // 브라우저는 아무 일도 안 일어난 접속으로 안다.
        deliver(workId, emitter) { it.send(SseEmitter.event().comment("connected")) }
        return emitter
    }

    fun publish(workId: UUID) {
        rooms[workId]?.forEach { emitter ->
            deliver(workId, emitter) { it.send(SseEmitter.event().name(EVENT_NAME).data(workId.toString())) }
        }
    }

    /**
     * 프록시는 조용한 접속을 60초쯤에 끊는다. 그보다 자주 주석 한 줄을 흘려보내 살려둔다 —
     * 끊겨도 브라우저가 다시 붙지만, 보는 사람이 여럿이면 그때마다 재접속이 몰린다.
     */
    private fun heartbeat() {
        rooms.forEach { (workId, room) ->
            room.forEach { emitter ->
                deliver(workId, emitter) { it.send(SseEmitter.event().comment("keep-alive")) }
            }
        }
    }

    /** 이미 끊긴 접속에 쓰면 예외가 난다 — 그건 오류가 아니라 그냥 창을 닫은 사람이다 */
    private fun deliver(workId: UUID, emitter: SseEmitter, send: (SseEmitter) -> Unit) {
        try {
            send(emitter)
        } catch (_: Exception) {
            drop(workId, emitter)
            runCatching { emitter.complete() }
        }
    }

    private fun drop(workId: UUID, emitter: SseEmitter) {
        rooms.computeIfPresent(workId) { _, room ->
            room.remove(emitter)
            room.ifEmpty { null }
        }
    }

    @PreDestroy
    fun shutdown() {
        keepAlive.shutdownNow()
        rooms.values.forEach { room -> room.forEach { runCatching { it.complete() } } }
        rooms.clear()
    }

    private companion object {
        const val EVENT_NAME = "slots-changed"
        val HEARTBEAT: Duration = Duration.ofSeconds(20)

        /** 무한정 열어두지는 않는다 — 새는 접속이 있어도 결국 정리되고, 브라우저는 다시 붙는다 */
        val STREAM_TIMEOUT: Duration = Duration.ofMinutes(30)
    }
}
