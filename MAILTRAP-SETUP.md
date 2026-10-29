# Подтверждение email через Mailtrap

SDK `mailtrap` уже установлен. Команда установки SDK: `npm install mailtrap`. Для этого проекта используйте `npm ci`: совместимые версии SDK, Nodemailer и типов закреплены в package-lock.json.

Mailtrap встроен в `server/mail.ts` через Nodemailer. Better Auth отправляет ссылки подтверждения и восстановления пароля на адрес из аккаунта. Тестовый получатель из образца в код не добавлен.

## Настройка

В существующем `.env` добавьте или измените эти строки. Не заменяйте весь файл: подключения БД и секрет авторизации уже настроены.

```dotenv
MAIL_PROVIDER=mailtrap
MAILTRAP_API_TOKEN=replace-with-your-mailtrap-sending-token
MAILTRAP_FROM_EMAIL=hello@demomailtrap.com
MAILTRAP_FROM_NAME=Klar
AUTH_REQUIRE_EMAIL_VERIFICATION=true
BETTER_AUTH_URL=http://localhost:5173
```

- Вместо `replace-with-your-mailtrap-sending-token` укажите токен отправки из Mailtrap → Email Sending → Sending Domains → ваш домен → Integration. Это замена `<YOUR_API_TOKEN>` из образца. Токену нужны права отправки для выбранного домена. Храните его только в серверном `.env`, без префикса `VITE_`.
- `hello@demomailtrap.com` оставьте только если Mailtrap показывает этот адрес в вашей интеграции. Demo Domain отправляет письма только на email владельца аккаунта Mailtrap. Для других пользователей добавьте собственный домен в [Sending Domains](https://mailtrap.io/domains), внесите выданные DNS-записи, дождитесь подтверждения и замените `MAILTRAP_FROM_EMAIL` адресом своего домена, например `no-reply@ваш-домен`.
- `MAILTRAP_FROM_NAME=Klar` — имя отправителя; можно оставить. Оно заменяет `Mailtrap Test` из образца.
- `BETTER_AUTH_URL` — адрес приложения: локально оставьте `http://localhost:5173`, после публикации замените реальным HTTPS-доменом. Это не порт API 3000.
- `AUTH_REQUIRE_EMAIL_VERIFICATION=true` включает подтверждение для входа по паролю. Уже подтверждённые аккаунты не требуют повторного подтверждения. Ранее созданный неподтверждённый аккаунт должен подтвердить адрес при следующем входе.

`artur.dudnik@inbox.ru` **не нужно вставлять в код или `.env`**. Укажите его в форме регистрации для проверки, если он совпадает с email владельца Mailtrap при использовании Demo Domain. В реальной работе каждое письмо уходит соответствующему пользователю.

## Проверка

1. После заполнения `.env` перезапустите API: остановите его и запустите `npm run dev:api`. Фронтенд: `npm run dev`.
2. Откройте http://localhost:5173. Зарегистрируйтесь на разрешённый адрес; до подтверждения вход по паролю запрещён.
3. Откройте письмо и перейдите по ссылке в течение часа. Сайт должен открыться с активной сессией. Гостевой прогресс переносится автоматически на этом устройстве.
4. Для повторной отправки используйте кнопку подтверждения в форме входа, для сброса пароля — «Забыли пароль?».
5. Проверьте [Mailtrap Email Logs](https://mailtrap.io/sending/email_logs), статус доставки и папку «Спам». Успешный ответ API ещё не означает доставку во «Входящие».

Для настоящего почтового ящика нужен Email Sending. Sandbox перехватывает письма внутри Mailtrap. Бесплатный локальный резерв без доставки в интернет — Mailpit из DATABASE-SETUP.md: задайте `MAIL_PROVIDER=smtp` и прежние `SMTP_*`.

Реальные токен и отправитель в репозитории не заполнены. Письма при реализации не отправлялись; реальную доставку нужно проверить после настройки. Для Vercel задайте эти серверные переменные отдельно в нужной среде.

Источники: [Mailtrap Email API/SMTP](https://docs.mailtrap.io/getting-started/email-api-smtp.md), [Sending Domain Setup](https://docs.mailtrap.io/email-api-smtp/setup/sending-domain), [официальный SDK Node.js](https://github.com/railsware/mailtrap-nodejs).
