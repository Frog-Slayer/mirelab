package com.mirelab.domain.auth

import com.mirelab.domain.user.User
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class AccessRequestStatus {
    PENDING,
    APPROVED,
    REJECTED,
}

/**
 * 가입 신청. 등록되지 않은 구글 계정으로 로그인을 시도하면 거부하는 대신 여기 한 줄이 쌓이고,
 * admin 이 승인할 때 [User] 가 만들어진다.
 *
 * 이메일당 한 행만 둔다(재시도해도 새로 안 쌓임). 거부당한 사람이 다시 로그인하면 같은 행이
 * PENDING 으로 돌아가 admin 목록에 다시 뜬다 — 오해로 거부한 경우를 되돌릴 방법이 필요하다.
 */
@Entity
@Table(name = "access_requests")
class AccessRequest(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(nullable = false, unique = true)
    val email: String,

    /** 구글 프로필의 이름 — 승인 화면에서 멤버 이름의 기본값으로 쓴다 */
    @Column(name = "google_name", nullable = false)
    var googleName: String,

    @Column(name = "picture_url")
    var pictureUrl: String? = null,

    @Column(name = "requested_at", nullable = false)
    var requestedAt: Instant = Instant.now(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: AccessRequestStatus = AccessRequestStatus.PENDING,

    @Column(name = "decided_at")
    var decidedAt: Instant? = null,

    /** 승인 결과로 만들어진 사람 — 나중에 "이 계정이 누구였나" 를 되짚을 때 쓴다 */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_user_id")
    var grantedUser: User? = null,
) {
    /** 이미 있는 신청에 다시 로그인 시도가 들어왔을 때 — 최신 구글 프로필로 갱신하고 다시 대기로 */
    fun reopen(googleName: String, pictureUrl: String?, now: Instant = Instant.now()) {
        this.googleName = googleName
        this.pictureUrl = pictureUrl
        this.requestedAt = now
        this.status = AccessRequestStatus.PENDING
        this.decidedAt = null
    }

    fun approve(grantedUser: User, now: Instant = Instant.now()) {
        this.status = AccessRequestStatus.APPROVED
        this.grantedUser = grantedUser
        this.decidedAt = now
    }

    fun reject(now: Instant = Instant.now()) {
        this.status = AccessRequestStatus.REJECTED
        this.grantedUser = null
        this.decidedAt = now
    }
}
