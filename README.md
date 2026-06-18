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

Authentik の **Property Mappings** で以下を作成してプロバイダーに追加。

**注意**: スコープマッピングの戻り値は必ず `dict` にする。`dict` 以外を返すと authentik 側で
`Scope returned a non-dict value, ignoring` という警告を出して claim を黒消しにする（`isinstance(value, dict)` チェックがあるため）。

**student_id** マッピング（scope_name: `student_id`）:
```python
return {"student_id": request.user.attributes.get("student_id")}
```

**discord** マッピング（scope_name: `discord`、ユーザー属性 `discord` に `{id, username, global_name, avatar_url}` を事前に入れておく）:
```python
return {"discord": request.user.attributes.get("discord")}
```

**groups** マッピング（scope_name: `groups`）:
```python
return {"groups": [g.name for g in request.user.groups.all()]}
```

ローカルで同じ構成を自動構築する `blueprints/sample-data.yaml` も参照（[ローカル検証用 Authentik](#5-ローカル検証用-authentikサンプルデータ)）。

### 3. キオスクアカウント作成

1. Authentik でユーザーを作成（例: `kiosk-001`）
2. `kiosk` グループを作成し、そのユーザーを追加
3. ブラウザで `/login` からログインしてセッションを確立

### 4. Discord OAuth ソース（任意）

1. Authentik > **Directory > Federation & Social login** で Discord ソースを追加
2. ユーザーがAuthentikにDiscordアカウントをリンクすると `/toggle` コマンドが使用可能になる

### 5. ローカル検証用 Authentik（サンプルデータ）

本物のAuthentikを実機なしで検証したい場合、サンプルユーザー入りの使い捨てAuthentikを `docker-compose.authentik.yml` で起動できる。`blueprints/sample-data.yaml` が起動時に自動投入する内容:

- グループ `kiosk`
- ユーザー `yamada` / `suzuki`（`student_id`, `discord` attributeあり） / `kiosk-001`（`kiosk`グループ所属）
- OAuth2/OIDC Provider + Application（スラッグ `room-presence-tracker`）、`student_id` / `discord` / `groups` カスタムスコープも設定済み
- `src/lib/authentik.ts` 用APIトークン（akadminに紐付け）

```bash
# 1. 環境変数を用意
cp .env.authentik.example .env.authentik

# 2. Authentik起動（初回はDBマイグレーション+blueprint投入で1〜2分かかる）
docker compose -f docker-compose.authentik.yml --env-file .env.authentik up -d

# 3. http://localhost:9000 で akadmin / .env.authentik の AUTHENTIK_BOOTSTRAP_PASSWORD でログイン確認可能

# 4. アプリ側 .env.local に以下を設定（値は .env.authentik と合わせる）
# AUTHENTIK_ISSUER=http://localhost:9000/application/o/room-presence-tracker/
# AUTHENTIK_CLIENT_ID=<.env.authentik の DEV_AUTHENTIK_CLIENT_ID>
# AUTHENTIK_CLIENT_SECRET=<.env.authentik の DEV_AUTHENTIK_CLIENT_SECRET>
# AUTHENTIK_API_TOKEN=<.env.authentik の DEV_AUTHENTIK_API_TOKEN>

# 5. 後片付け（DBごと削除）
docker compose -f docker-compose.authentik.yml down -v
```

検証用なので `.gitignore` の `.env*` ルールにより `.env.authentik` / `.env.authentik.example` ともにgit管理外。チームで共有する場合は別途リポジトリへの追加を検討する。

LDAPのサンプルデータ単体で検証したい場合（Authentikを介さない素のLDAP動作確認）は `rroemhild/test-openldap` などの既成イメージを使う方法もあるが、本プロジェクトはAuthentikのREST/OIDC経由でしかユーザー情報を取得しないため、上記のAuthentikスタックでの検証を推奨。

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
