# 実行委員室 在室管理システム

文化祭実行委員室の入退室をリアルタイムで管理するWebアプリケーション。

## 機能

- 🔐 **OIDC 認証**（Authentik）
- 🟢 **在退室トグル**（Webブラウザ）
- 📷 **バーコードスキャン**（キオスク端末・学生証 1D バーコード）
- 🕛 **深夜0時 自動リセット**（K8s CronJob）
- 📊 **入退室ログ**（全履歴）
- 🤖 **Discord スラッシュコマンド**（`/presence`, `/toggle`）
- 🚀 **CI/CD**（GitHub Actions → GHCR → ArgoCD）

---

## ローカル開発

### 前提条件
- Node.js 20+
- Docker & Docker Compose

### セットアップ

```bash
# 1. 依存関係のインストール
npm ci

# 2. 環境変数の設定
cp .env.example .env.local
# .env.local を編集して各値を設定

# 3. DB 起動（開発用 PostgreSQL）
docker compose up -d postgres

# 4. スキーマ適用
npm run db:push

# 5. 開発サーバー起動
npm run dev
```

### 開発用コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run db:push` | スキーマをDBに直接適用（開発用） |
| `npm run db:generate` | マイグレーションファイル生成 |
| `npm run db:migrate` | マイグレーション実行 |
| `npm run db:studio` | Drizzle Studio（DB GUI）起動 |
| `npm run discord:register` | Discordスラッシュコマンド登録 |

---

## Authentik 設定

### 1. OAuth2/OIDC Provider 作成

| 項目 | 値 |
|------|-----|
| Name | room-presence |
| Grant Type | Authorization Code |
| Redirect URIs | `https://<your-domain>/api/auth/callback/authentik` |
| Scopes | `openid email profile` |

### 2. カスタム Property Mapping（OIDC）

Authentik の **Property Mappings** で以下を作成してプロバイダーに追加:

**student_id** マッピング:
```python
return request.user.attributes.get("student_id", None)
```

**discord_id** マッピング（Discord OAuthソース連携後）:
```python
social = request.user.socialaccount_set.filter(provider="discord").first()
return social.uid if social else None
```

**groups** マッピング:
```python
return [g.name for g in request.user.ak_groups.all()]
```

### 3. キオスクアカウント作成

1. Authentik でユーザーを作成（例: `kiosk-001`）
2. `kiosk` グループを作成し、そのユーザーを追加
3. ブラウザで `/login` からログインしてセッションを確立

### 4. Discord OAuth ソース（任意）

1. Authentik > **Directory > Federation & Social login** で Discord ソースを追加
2. ユーザーがAuthentikにDiscordアカウントをリンクすると `/toggle` コマンドが使用可能になる

---

## Discord Bot 設定

```bash
# 1. Discord Developer Portal でアプリケーション作成
# 2. Interactions Endpoint URL を設定:
#    https://<your-domain>/api/discord/interactions
# 3. スラッシュコマンド登録:
npm run discord:register
```

### コマンド

| コマンド | 説明 |
|---------|------|
| `/presence` | 現在の在室者一覧を表示 |
| `/toggle` | 自分の在室状態をトグル |

---

## K8s デプロイ（K3s）

```bash
# 深夜リセット CronJob の適用
kubectl apply -f k8s/midnight-reset-cronjob.yaml

# Secret の作成
kubectl create secret generic presence-secrets \
  --from-literal=RESET_SECRET=<your-reset-secret> \
  -n room-presence
```

### CronJob 仕様
- スケジュール: 毎日 0:00 JST（`0 0 * * *` Asia/Tokyo）
- `POST /api/presence/reset` を内部 Service 経由で呼び出す

---

## 環境変数

| 変数 | 説明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `AUTH_SECRET` | Auth.js シークレット（`openssl rand -base64 32`） |
| `AUTHENTIK_ISSUER` | Authentik OIDC Issuer URL |
| `AUTHENTIK_CLIENT_ID` | Authentik Client ID |
| `AUTHENTIK_CLIENT_SECRET` | Authentik Client Secret |
| `RESET_SECRET` | 深夜リセット用 Bearer トークン |
| `DISCORD_APPLICATION_ID` | Discord Application ID |
| `DISCORD_PUBLIC_KEY` | Discord Public Key |
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `NEXT_PUBLIC_APP_URL` | アプリの公開 URL |

---

## アーキテクチャ

```
Browser (User)  ──OIDC──►  Authentik  ◄──Discord OAuth
    │                           │
    ▼                           │
Next.js App  ◄────JWT────── Auth.js
    │
    ├── /presence   (在室一覧 + トグル)
    ├── /kiosk      (バーコードスキャン)
    ├── /stats      (入退室ログ)
    └── /api/*      (REST API)
         │
    Drizzle ORM
         │
    PostgreSQL
    
K8s CronJob ──Bearer──► /api/presence/reset  (0:00 JST)
Discord ──Webhook──► /api/discord/interactions
```
