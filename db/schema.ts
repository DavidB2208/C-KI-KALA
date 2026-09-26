import { sqliteTable, text, integer, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";
// Better Auth core schema. Drizzle owns migrations; runtime never creates tables.
export const authUsers=sqliteTable("auth_user",{
 id:text("id").primaryKey(),name:text("name").notNull(),email:text("email").notNull(),emailVerified:integer("emailVerified",{mode:"boolean"}).notNull().default(false),image:text("image"),createdAt:integer("createdAt").notNull(),updatedAt:integer("updatedAt").notNull()
},t=>[uniqueIndex("idx_auth_user_email").on(t.email)]);
export const authSessions=sqliteTable("auth_session",{
 id:text("id").primaryKey(),expiresAt:integer("expiresAt").notNull(),token:text("token").notNull(),createdAt:integer("createdAt").notNull(),updatedAt:integer("updatedAt").notNull(),ipAddress:text("ipAddress"),userAgent:text("userAgent"),userId:text("userId").notNull().references(()=>authUsers.id,{onDelete:"cascade"})
},t=>[uniqueIndex("idx_auth_session_token").on(t.token),index("idx_auth_session_user").on(t.userId)]);
export const authAccounts=sqliteTable("auth_account",{
 id:text("id").primaryKey(),accountId:text("accountId").notNull(),providerId:text("providerId").notNull(),userId:text("userId").notNull().references(()=>authUsers.id,{onDelete:"cascade"}),accessToken:text("accessToken"),refreshToken:text("refreshToken"),idToken:text("idToken"),accessTokenExpiresAt:integer("accessTokenExpiresAt"),refreshTokenExpiresAt:integer("refreshTokenExpiresAt"),scope:text("scope"),password:text("password"),createdAt:integer("createdAt").notNull(),updatedAt:integer("updatedAt").notNull()
},t=>[index("idx_auth_account_user").on(t.userId),uniqueIndex("idx_auth_account_provider").on(t.providerId,t.accountId)]);
export const authVerifications=sqliteTable("auth_verification",{
 id:text("id").primaryKey(),identifier:text("identifier").notNull(),value:text("value").notNull(),expiresAt:integer("expiresAt").notNull(),createdAt:integer("createdAt").notNull(),updatedAt:integer("updatedAt").notNull()
},t=>[index("idx_auth_verification_identifier").on(t.identifier)]);
export const recoveryKeys=sqliteTable("auth_recovery",{
 userId:text("user_id").primaryKey().references(()=>authUsers.id,{onDelete:"cascade"}),tokenHash:text("token_hash").notNull(),createdAt:integer("created_at").notNull()
});
export const bootstrap=sqliteTable("admin_bootstrap",{key:text("key").primaryKey(),claimedBy:text("claimed_by").notNull(),claimedAt:integer("claimed_at").notNull()});
export const adminAudit=sqliteTable("admin_audit",{id:text("id").primaryKey(),actorId:text("actor_id").notNull(),action:text("action").notNull(),targetId:text("target_id").notNull(),createdAt:integer("created_at").notNull()},t=>[index("idx_admin_audit_created").on(t.createdAt)]);
export const profiles=sqliteTable("profiles",{
 id:text("id").primaryKey(),authSubject:text("auth_subject"),accountId:text("account_id").references(()=>authUsers.id,{onDelete:"set null"}),role:text("role").notNull().default("player"),suspendedAt:integer("suspended_at"),name:text("name").notNull(),avatar:integer("avatar").notNull().default(0),createdAt:integer("created_at").notNull()
},t=>[uniqueIndex("idx_profiles_auth_subject").on(t.authSubject),uniqueIndex("idx_profiles_account_id").on(t.accountId)]);
export const sessions=sqliteTable("guest_sessions",{
 tokenHash:text("token_hash").primaryKey(),profileId:text("profile_id").notNull().references(()=>profiles.id,{onDelete:"cascade"}),expiresAt:integer("expires_at").notNull()
},t=>[index("idx_sessions_expires").on(t.expiresAt),index("idx_sessions_profile").on(t.profileId)]);
export const rooms=sqliteTable("rooms",{
 code:text("code").primaryKey(),hostId:text("host_id").notNull(),status:text("status").notNull().default("lobby"),pack:text("pack").notNull(),roundCount:integer("round_count").notNull(),currentRound:integer("current_round").notNull().default(0),duration:integer("duration").notNull(),squadId:text("squad_id").references(()=>squads.id,{onDelete:"set null"}),deckName:text("deck_name"),visualTheme:text("visual_theme").notNull().default("neon"),mode:text("mode").notNull().default("players"),themeMode:text("theme_mode").notNull().default("pack"),setName:text("set_name").notNull().default("Les joueurs"),targets:text("targets").notNull().default("[]"),roster:text("roster").notNull().default("[]"),deadline:integer("deadline"),createdAt:integer("created_at").notNull(),finishedAt:integer("finished_at"),expiresAt:integer("expires_at").notNull()
},t=>[index("idx_rooms_host_status").on(t.hostId,t.status),index("idx_rooms_expires").on(t.expiresAt)]);
export const members=sqliteTable("members",{
 id:text("id").primaryKey(),roomCode:text("room_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),profileId:text("profile_id").references(()=>profiles.id,{onDelete:"set null"}),name:text("name").notNull(),nameKey:text("name_key").notNull(),avatar:integer("avatar").notNull(),state:text("state").notNull().default("joined"),squadConsent:integer("squad_consent").notNull().default(0),lastSeen:integer("last_seen").notNull(),joinedAt:integer("joined_at").notNull()
},t=>[uniqueIndex("idx_members_room_profile").on(t.roomCode,t.profileId),uniqueIndex("idx_members_room_name").on(t.roomCode,t.nameKey),index("idx_members_profile").on(t.profileId)]);
export const rounds=sqliteTable("rounds",{
 roomCode:text("room_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),number:integer("number").notNull(),question:text("question"),skipped:integer("skipped").notNull().default(0)
},t=>[primaryKey({columns:[t.roomCode,t.number]})]);
export const ballots=sqliteTable("ballots",{
 roomCode:text("room_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),round:integer("round").notNull(),memberId:text("member_id").notNull().references(()=>members.id,{onDelete:"cascade"}),rankings:text("rankings").notNull(),abstained:integer("abstained").notNull().default(0),submittedAt:integer("submitted_at").notNull()
},t=>[primaryKey({columns:[t.roomCode,t.round,t.memberId]}),index("idx_ballots_member").on(t.memberId)]);
export const sets=sqliteTable("saved_sets",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>profiles.id,{onDelete:"cascade"}),name:text("name").notNull(),items:text("items").notNull(),updatedAt:integer("updated_at").notNull()
},t=>[index("idx_sets_owner").on(t.ownerId)]);
export const proposals=sqliteTable("proposals",{
 id:text("id").primaryKey(),roomCode:text("room_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),round:integer("round").notNull(),memberId:text("member_id").notNull().references(()=>members.id,{onDelete:"cascade"}),question:text("question").notNull()
},t=>[uniqueIndex("idx_proposals_room_round_member").on(t.roomCode,t.round,t.memberId)]);
export const rateLimits=sqliteTable("rate_limits",{key:text("key").primaryKey(),count:integer("count").notNull(),expiresAt:integer("expires_at").notNull()},t=>[index("idx_rate_expires").on(t.expiresAt)]);
export const reports=sqliteTable("question_reports",{
 id:text("id").primaryKey(),roomCode:text("room_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),round:integer("round").notNull(),memberId:text("member_id").notNull().references(()=>members.id,{onDelete:"cascade"}),reason:text("reason").notNull(),createdAt:integer("created_at").notNull()
},t=>[uniqueIndex("idx_reports_room_round_member").on(t.roomCode,t.round,t.memberId)]);
// One successor per game: simultaneous rematch clicks converge on the same lobby.
export const rematches=sqliteTable("rematches",{
 sourceCode:text("source_code").primaryKey().references(()=>rooms.code,{onDelete:"cascade"}),
 targetCode:text("target_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),
 createdAt:integer("created_at").notNull()
},t=>[uniqueIndex("idx_rematches_target").on(t.targetCode)]);
export const questionFeedback=sqliteTable("question_feedback",{
 roomCode:text("room_code").notNull().references(()=>rooms.code,{onDelete:"cascade"}),
 round:integer("round").notNull(),
 memberId:text("member_id").notNull().references(()=>members.id,{onDelete:"cascade"}),
 rating:integer("rating").notNull(),updatedAt:integer("updated_at").notNull()
},t=>[primaryKey({columns:[t.roomCode,t.round,t.memberId]}),index("idx_feedback_member").on(t.memberId)]);
export const squads=sqliteTable("squads",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>profiles.id),name:text("name").notNull(),description:text("description").notNull().default(""),createdAt:integer("created_at").notNull()
},t=>[index("idx_squads_owner").on(t.ownerId)]);
export const squadMembers=sqliteTable("squad_members",{
 squadId:text("squad_id").notNull().references(()=>squads.id,{onDelete:"cascade"}),profileId:text("profile_id").notNull().references(()=>profiles.id,{onDelete:"cascade"}),state:text("state").notNull().default("active"),joinedAt:integer("joined_at").notNull()
},t=>[primaryKey({columns:[t.squadId,t.profileId]}),index("idx_squad_members_profile").on(t.profileId,t.state)]);
export const squadInvites=sqliteTable("squad_invites",{
 squadId:text("squad_id").primaryKey().references(()=>squads.id,{onDelete:"cascade"}),tokenHash:text("token_hash").notNull(),expiresAt:integer("expires_at").notNull()
},t=>[uniqueIndex("idx_squad_invites_token").on(t.tokenHash)]);
export const decks=sqliteTable("question_decks",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull().references(()=>profiles.id,{onDelete:"cascade"}),name:text("name").notNull(),questions:text("questions").notNull(),updatedAt:integer("updated_at").notNull()
},t=>[index("idx_decks_owner").on(t.ownerId)]);
export const billingCustomers=sqliteTable("billing_customers",{
 profileId:text("profile_id").primaryKey().references(()=>profiles.id,{onDelete:"cascade"}),customerId:text("customer_id").notNull(),mode:text("mode").notNull()
},t=>[uniqueIndex("idx_billing_customer_id").on(t.customerId)]);
export const billingOrders=sqliteTable("billing_orders",{
 id:text("id").primaryKey(),profileId:text("profile_id").references(()=>profiles.id,{onDelete:"set null"}),sku:text("sku").notNull(),amount:integer("amount").notNull(),currency:text("currency").notNull(),mode:text("mode").notNull(),status:text("status").notNull().default("pending"),sessionId:text("session_id"),paymentId:text("payment_id"),subscriptionId:text("subscription_id"),createdAt:integer("created_at").notNull(),paidAt:integer("paid_at"),revokedAt:integer("revoked_at"),termsUrl:text("terms_url"),termsAcceptedAt:integer("terms_accepted_at")
},t=>[uniqueIndex("idx_billing_session").on(t.sessionId),index("idx_billing_orders_profile").on(t.profileId,t.status),index("idx_billing_payment").on(t.paymentId),index("idx_billing_subscription").on(t.subscriptionId)]);
export const entitlements=sqliteTable("entitlements",{
 sourceId:text("source_id").primaryKey(),profileId:text("profile_id").notNull().references(()=>profiles.id,{onDelete:"cascade"}),kind:text("kind").notNull(),packId:text("pack_id"),expiresAt:integer("expires_at"),revokedAt:integer("revoked_at"),updatedAt:integer("updated_at").notNull(),mode:text("mode").notNull()
},t=>[index("idx_entitlements_profile").on(t.profileId)]);
export const billingSubscriptions=sqliteTable("billing_subscriptions",{
 id:text("id").primaryKey(),profileId:text("profile_id").references(()=>profiles.id,{onDelete:"set null"}),status:text("status").notNull(),periodEnd:integer("period_end").notNull(),cancelAtPeriodEnd:integer("cancel_at_period_end").notNull().default(0),updatedAt:integer("updated_at").notNull(),blockedAt:integer("blocked_at"),mode:text("mode").notNull()
},t=>[index("idx_subscriptions_profile").on(t.profileId)]);
export const billingEvents=sqliteTable("billing_events",{
 id:text("id").primaryKey(),type:text("type").notNull(),processedAt:integer("processed_at").notNull()
});
export const operationLocks=sqliteTable("operation_locks",{
 key:text("key").primaryKey(),token:text("token").notNull(),expiresAt:integer("expires_at").notNull()
});
export const billingPayments=sqliteTable("billing_payments",{
 paymentId:text("payment_id").primaryKey(),subscriptionId:text("subscription_id"),orderId:text("order_id"),revokedAt:integer("revoked_at")
},t=>[index("idx_payments_subscription").on(t.subscriptionId)]);
