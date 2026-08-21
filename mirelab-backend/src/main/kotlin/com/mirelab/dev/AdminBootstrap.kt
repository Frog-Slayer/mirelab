package com.mirelab.dev

import com.mirelab.domain.auth.AccessRequestStatus
import com.mirelab.domain.user.Role
import com.mirelab.domain.user.User
import com.mirelab.infra.auth.AccessRequestRepository
import com.mirelab.infra.user.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

/**
 * admin 계정이 반드시 하나 있게 보장한다. 매 부팅마다 돌고, 이미 맞으면 아무것도 안 한다.
 *
 * [DevDataSeeder]는 스터디·슬롯 같은 구조만 만들고 사용자는 만들지 않는다. 따라서 개발과
 * 운영 모두에서 별도로 admin 계정을 보장해야 한다:
 *
 * 1. 운영 첫 배포 — 시더가 아예 안 돈다. 사용자가 0명이면 로그인할 사람도, 가입 신청을
 *    승인할 사람도 없어서 아무도 들어올 수 없는 잠긴 서비스가 된다.
 * 2. 인증을 붙이기 전에 이미 시딩된 DB — email/role 컬럼이 나중에 NULL 로 덧붙어서,
 *    admin 이어야 할 사람의 email 이 비어 있다.
 *
 * 개발에서는 구조 시더 다음에 실행되도록 순서만 명시한다.
 */
@Order(ADMIN_BOOTSTRAP_ORDER)
@Component
class AdminBootstrap(
    private val userRepository: UserRepository,
    private val accessRequestRepository: AccessRequestRepository,
    @Value("\${mirelab.admin-email}") private val adminEmail: String,
    @Value("\${mirelab.admin-name}") private val adminName: String,
) : CommandLineRunner {
    private val logger = LoggerFactory.getLogger(this::class.java)

    @Transactional
    override fun run(vararg args: String) {
        if (adminEmail.isBlank()) {
            logger.warn("mirelab.admin-email 이 비어 있어 admin 보장을 건너뜁니다 — 아무도 가입을 승인할 수 없습니다")
            return
        }

        val admin = userRepository.findByEmail(adminEmail)?.also { promoteIfNeeded(it) }
            ?: adoptOrCreate()

        // 자기 자신에 대한 대기 신청이 남아 있으면 정리한다. 안 그러면 admin 이 멤버 관리
        // 화면에서 자기 이메일을 보게 되고, 승인을 누르면 이미 가입된 이메일이라 409 가 난다.
        accessRequestRepository.findByEmail(adminEmail)
            ?.takeIf {
                it.status == AccessRequestStatus.PENDING ||
                    it.status == AccessRequestStatus.PROFILE_REQUIRED
            }
            ?.let {
                it.approve(admin)
                logger.info("admin 본인의 대기 중 가입 신청을 정리했습니다: {}", adminEmail)
            }
    }

    private fun promoteIfNeeded(user: User) {
        if (user.role == Role.ADMIN) return
        user.role = Role.ADMIN
        logger.info("{} 를 admin 으로 올렸습니다", adminEmail)
    }

    /**
     * 이름이 같고 아직 로그인 계정이 안 붙은 사람이 있으면 그 행에 이메일을 붙인다.
     * 인증 붙기 전에 시딩된 DB 를 위한 것이다 — 새로 만들어버리면 같은 이름이 둘이 되고,
     * 그 사람이 그때까지 쌓은 기록(SlotValue·Work.addedBy)이 주인 없이 남는다.
     */
    private fun adoptOrCreate(): User {
        val adopted = userRepository.findAll()
            .firstOrNull { it.email == null && it.name == adminName }

        if (adopted != null) {
            adopted.email = adminEmail
            adopted.role = Role.ADMIN
            logger.info("기존 '{}' 행에 admin 계정({})을 붙였습니다", adminName, adminEmail)
            return adopted
        }

        logger.info("admin 계정을 새로 만듭니다: {} ({})", adminName, adminEmail)
        return userRepository.save(
            User(name = adminName, color = ADMIN_COLOR, email = adminEmail, role = Role.ADMIN),
        )
    }

    private companion object {
        /** CollaborativeBody 의 COLOR_HEX 가 아는 색이어야 Yjs 커서가 회색으로 안 떨어진다 */
        const val ADMIN_COLOR = "bg-emerald-500"
    }
}

/** DevDataSeeder(=[DEV_SEEDER_ORDER]) 보다 뒤 */
const val ADMIN_BOOTSTRAP_ORDER = 2
