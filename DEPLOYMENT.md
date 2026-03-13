# Руководство по деплою корпоративной платформы обучения

ASP.NET Core 8 + React + PostgreSQL на Ubuntu 20.04.

*Гайд для развёртывания на сервере (тестовый или рабочий деплой, не обязательно production-ready).*

---

## Данные вашего сервера

| Параметр | Значение |
|----------|----------|
| IP | `95.182.121.83` |
| Домен | `learning.dvsmet.ru` |
| Пользователь | `deploy` |
| Пароль пользователя | `deploy229` |
| Имя ВМ | vm201817 |

*Команды ниже используют эти значения — можно копировать без замены.*

---

## Содержание

1. [Подготовка сервера](#1-подготовка-сервера)
2. [Пользователь и SSH](#2-пользователь-и-ssh)
3. [Установка ПО](#3-установка-по)
4. [Первоначальный деплой](#4-первоначальный-деплой)
5. [Перенос базы данных](#5-перенос-базы-данных)
6. [HTTPS и Nginx](#6-https-и-nginx)
7. [Автозапуск и systemd](#7-автозапуск-и-systemd)
8. [Обновления и фиксы](#8-обновления-и-фиксы)
9. [Домен](#9-домен)
10. [Git и деплой одним нажатием](#10-git-и-деплой-одним-нажатием)

---

## 1. Подготовка сервера

### Аренда VPS

- **Провайдеры:** Timeweb, Selectel, VDSina, Hetzner, DigitalOcean и др.
- **Минимум:** 1 CPU, 1 GB RAM, 10 GB SSD
- **Рекомендуется:** 2 CPU, 2 GB RAM

### Подключение по PuTTY

1. Скачайте [PuTTY](https://www.putty.org/).
2. **Host Name:** `95.182.121.83`
3. **Port:** 22.
4. **Connection type:** SSH.
5. **Save** — сохраните сессию для удобства.
6. Логин: `deploy`, пароль: `deploy229`

При первом подключении появится предупреждение о ключе — нажмите **Yes**.

---

## 2. Пользователь и SSH

### Создание пользователя (не root)

```bash
# Создать пользователя (например, deploy)
sudo adduser deploy

# Добавить в группу sudo
sudo usermod -aG sudo deploy

# Переключиться на нового пользователя
su - deploy
```

### Загрузка файлов на сервер

**Вариант A: WinSCP (рекомендуется)**

1. Скачайте [WinSCP](https://winscp.net/).
2. Протокол: **SFTP**.
3. Хост: `95.182.121.83`, порт 22.
4. Логин: `deploy`, пароль: `deploy229`.
5. Перетаскивайте файлы в нужные папки.

**Вариант B: rsync (через PuTTY)**

```bash
# С Windows (если установлен rsync или WSL)
rsync -avz -e "ssh" ./MyWebApi deploy@95.182.121.83:/home/deploy/
```

**Вариант C: Git**

```bash
# На сервере
cd /home/deploy
git clone https://ваш-репозиторий.git myapp
```

---

## 3. Установка ПО

Подключитесь по SSH (`95.182.121.83`, пользователь `deploy`) и выполните:

### 3.1 Обновление системы

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 .NET 8 (SDK + Runtime)

Для `dotnet publish` нужен SDK, а не только runtime. Установите:

```bash
wget https://packages.microsoft.com/config/ubuntu/20.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

sudo apt update
sudo apt install -y dotnet-sdk-8.0
```

*(Если нужна только runtime для запуска уже собранного приложения: `aspnetcore-runtime-8.0`)*

### 3.3 PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

**Зачем создавать базу и пользователя?** Приложение хранит все данные (пользователи, курсы, заявки, чаты) в PostgreSQL. На сервере нужна своя база — «место», куда приложение будет писать. Строка подключения в `appsettings.Production.json` указывает именно на эту базу.

Создание базы и пользователя (всё вводится в PuTTY по шагам):

**Шаг 1.** Откройте консоль PostgreSQL:

```bash
sudo -u postgres psql
```

Нажмите Enter. Приглашение сменится на `postgres=#` — вы внутри PostgreSQL.

**Шаг 2.** Введите по одной строке (после каждой — Enter):

```sql
CREATE USER deploy WITH PASSWORD 'deploy229';
```

```sql
CREATE DATABASE myapp_db OWNER deploy;
```

**Шаг 3.** Выйти из psql:

```sql
\q
```

После этого вы снова в обычной оболочке сервера.

### 3.4 Node.js (для сборки фронтенда)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3.5 Nginx

```bash
sudo apt install -y nginx
```

---

## 4. Первоначальный деплой

### 4.1 Загрузка проекта на сервер

Создайте папку:

```bash
sudo mkdir -p /var/www/myapp
sudo chown deploy:deploy /var/www/myapp
```

Загрузите файлы проекта в `/var/www/myapp` (через WinSCP или git).

### 4.2 Сборка

**Вариант A: Сборка на Windows (рекомендуется)**

Если на сервере `dotnet restore` зависает или медленно идёт, соберите локально и загрузите результат:

```powershell
cd "c:\Users\smeta\MyWebApi 1"
cd client-app
npm run build
cd ..
dotnet publish -c Release -o ./publish
```

Через WinSCP загрузите всё содержимое папки `publish` в `/var/www/myapp/publish` на сервере (создайте папку при необходимости).

**Вариант B: Сборка на сервере**

```bash
cd /var/www/myapp

# Сборка фронтенда (React)
cd client-app
npm install
npm run build
cd ..

# Сборка бэкенда
dotnet publish -c Release -o ./publish
```

### 4.3 Конфигурация приложения (обязательно)

**Да, этот шаг обязателен.** Без него приложение не подключится к базе данных.

Создайте файл `appsettings.Production.json` в корне проекта (рядом с `appsettings.json`):

```bash
cd /var/www/myapp
nano appsettings.Production.json
```

Вставьте (данные уже под ваш сервер — пользователь `deploy`, пароль `deploy229`):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=myapp_db;Username=deploy;Password=deploy229;Port=5432"
  },
  "Cors": {
    "Origins": ["https://learning.dvsmet.ru", "http://learning.dvsmet.ru", "http://95.182.121.83"]
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

Сохраните: `Ctrl+O`, Enter, `Ctrl+X`.

Скопируйте в папку publish:

```bash
cp appsettings.Production.json ./publish/
```

### 4.4 Миграции БД

**Миграции применяются автоматически** при первом запуске приложения — шаг можно пропустить.

Если нужно применить миграции вручную (например, до запуска):

```bash
cd /var/www/myapp
dotnet ef database update --project . --configuration Release
```

Если `dotnet ef` не найден и `dotnet tool install --global dotnet-ef` зависает — просто запустите приложение: миграции применятся при старте.

### 4.5 Настройка Nginx (обязательно — без этого приложение недоступно снаружи)

Приложение слушает только localhost. Nginx принимает запросы на порту 80 и передаёт их приложению.

Создайте конфиг:

```bash
sudo nano /etc/nginx/sites-available/learning
```

Вставьте (Ctrl+Shift+V в PuTTY):

```nginx
server {
    listen 80;
    server_name learning.dvsmet.ru 95.182.121.83;
    
    location / {
        proxy_pass http://127.0.0.1:5233;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Сохраните: `Ctrl+O`, Enter, `Ctrl+X`.

Активируйте и перезагрузите Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/learning /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Откройте порты (если firewall включён):

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 4.6 Проверка запуска

Приложение должно быть запущено (если вы его останавливали — запустите снова):

```bash
cd /var/www/myapp/publish
dotnet MyWebApi.dll
```

Откройте в браузере **`http://95.182.121.83`** (без :5233, порт 80).

*Домен `learning.dvsmet.ru` заработает после настройки DNS (раздел 9).*

Остановите приложение для перехода к systemd: `Ctrl+C`.

---

## 5. Перенос базы данных

Схема таблиц создаётся миграциями (`dotnet ef database update`). Но сами данные (пользователи, курсы и т.д.) нужно либо создать заново, либо перенести с локальной машины.

### Вариант A: Пустая база (начать с нуля)

Если тестовые данные не нужны:

1. Миграции уже создали таблицы (шаг 4.4).
2. Создайте первого админа через приложение (регистрация, если есть, или через API/seed).
3. Либо добавьте временный seed в код для создания админа при первом запуске.

### Вариант B: Перенести данные с локальной машины

Если у вас локально (Windows) уже есть PostgreSQL с данными и вы хотите их перенести на сервер.

---

**Шаг 1. Создать файл резервной копии на Windows**

Файлы `backup.dump` и `backup.sql` **не нужно искать** — их создаёт команда `pg_dump`. Выполните её в PowerShell:

```powershell
cd "c:\Users\smeta\MyWebApi 1"

# Команда создаст файл backup.sql в этой же папке
& "D:\TORRENT2\Server_Test\bin\pg_dump.exe" -h localhost -U postgres -d Database_01 > backup.sql
```

При запросе введите пароль пользователя `postgres`. После выполнения в папке `c:\Users\smeta\MyWebApi 1\` появится файл **backup.sql**.

*(Альтернатива — формат .dump: замените команду на `-F c -f backup.dump`)*

*Стандартная установка PostgreSQL:* `C:\Program Files\PostgreSQL\16\bin\pg_dump.exe` (подставьте свою версию).

---

**Шаг 2. Загрузить файл на сервер**

Откройте WinSCP, подключитесь к `95.182.121.83` (логин `deploy`). Найдите на своём ПК файл `c:\Users\smeta\MyWebApi 1\backup.sql` и перетащите его в папку `/home/deploy/` на сервере.

---

**Шаг 3. Импорт на сервере**

Подключитесь по PuTTY и выполните (если использовали **backup.sql**):

```bash
sudo -u postgres psql -d myapp_db < /home/deploy/backup.sql
```

Если использовали **backup.dump**:

```bash
pg_restore -h localhost -U deploy -d myapp_db -v /home/deploy/backup.dump
```

**Важно**

- Миграции должны быть уже применены (таблицы созданы) перед импортом, если структура совпадает.
- Если локальная БД и серверная — разные версии миграций, сначала примените миграции на сервере, затем импортируйте только данные (без `CREATE TABLE`), используя `pg_restore --data-only` или выборочный импорт в SQL.
- Если структура на сервере отличается (новые миграции), проще экспортировать только данные, а не схему. В таком случае используйте `pg_dump --data-only`.

**Упрощённый вариант (схема + данные одинаковые):**

```bash
# На сервере: сначала удалить пустую БД и создать заново (если нужно)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS myapp_db;"
sudo -u postgres psql -c "CREATE DATABASE myapp_db OWNER deploy;"

# Импорт из SQL
sudo -u postgres psql -d myapp_db < /home/deploy/backup.sql
```

---

## 6. HTTPS и Nginx

*Nginx уже настроен в шаге 4.5. Ниже — только SSL-сертификат и редирект на HTTPS.*

### 6.2 Как получить HTTPS-сертификат (Let's Encrypt)

Let's Encrypt выдаёт бесплатные SSL-сертификаты. Сертификат привязан к домену.

**Что нужно до начала:**

1. Домен (например `learning.company.ru`) должен указывать на IP вашего сервера (A-запись в DNS).
2. Порты 80 и 443 открыты на сервере и в панели хостинга.
3. Nginx настроен и работает (раздел 6.1).

**Шаг 1. Установка Certbot**

В PuTTY выполните:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

**Шаг 2. Получение сертификата**

```bash
sudo certbot --nginx -d learning.dvsmet.ru
```

*(Если нужен и www.learning.dvsmet.ru — добавьте `-d www.learning.dvsmet.ru`)*

**Шаг 3. Диалог Certbot**

- **Email:** введите email для уведомлений (истечение сертификата, проблемы).
- **Условия использования:** `Y` (Agree).
- **Рассылка:** обычно `N` (No).
- Certbot проверит домен (запрос на `http://your-domain.com/.well-known/...`). Если DNS настроен верно, сертификат будет выдан.

**Шаг 4. Результат**

Certbot сам:

- получит сертификат;
- добавит в Nginx блок `listen 443 ssl`;
- настроит пути к сертификатам.

Сертификаты лежат в `/etc/letsencrypt/live/learning.dvsmet.ru/`.

**Шаг 5. Редирект HTTP → HTTPS**

Откройте конфиг:

```bash
sudo nano /etc/nginx/sites-available/learning
```

В блоке `server` с `listen 80` раскомментируйте или добавьте в начало:

```nginx
return 301 https://$server_name$request_uri;
```

Перезагрузите Nginx:

```bash
sudo systemctl reload nginx
```

**Продление сертификата**

Сертификат действует 90 дней. Certbot добавляет задачу на автообновление. Проверить:

```bash
sudo certbot renew --dry-run
```

**Если что-то пошло не так**

- **"Connection refused" / "Timeout"** — домен не указывает на сервер или порт 80 закрыт.
- **"Invalid response"** — Nginx не отдаёт запросы на домен, проверьте `server_name` в конфиге.

### 6.3 HTTPS в приложении

В проекте уже включён `UseHttpsRedirection()` для Production. CORS для вашего домена уже добавлен в шаге 4.3.

---

## 7. Автозапуск и systemd

Создайте systemd-сервис:

```bash
sudo nano /etc/systemd/system/myapp.service
```

Содержимое:

```ini
[Unit]
Description=MyWebApi Learning Platform
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/myapp/publish
ExecStart=/usr/bin/dotnet /var/www/myapp/publish/MyWebApi.dll
Restart=always
RestartSec=10
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://127.0.0.1:5233

[Install]
WantedBy=multi-user.target
```

Запуск и автозапуск:

```bash
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
sudo systemctl status myapp
```

Полезные команды:

```bash
sudo systemctl restart myapp   # перезапуск
sudo systemctl stop myapp      # остановка
sudo journalctl -u myapp -f    # логи в реальном времени
```

---

## 8. Обновления и фиксы

### 8.1 Скрипт деплоя

Создайте `/var/www/myapp/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /var/www/myapp

echo "=== Pulling changes ==="
git pull   # если используете git

echo "=== Building frontend ==="
cd client-app
npm install
npm run build
cd ..

echo "=== Building backend ==="
dotnet publish -c Release -o ./publish

echo "=== Copying config ==="
cp appsettings.Production.json ./publish/ 2>/dev/null || true

echo "=== Migrations ==="
dotnet ef database update --project . --configuration Release 2>/dev/null || true

echo "=== Restarting service ==="
sudo systemctl restart myapp

echo "=== Done ==="
```

Сделайте исполняемым:

```bash
chmod +x /var/www/myapp/deploy.sh
```

### 8.2 Ручной деплой (без git)

1. **Загрузите новые файлы** через WinSCP в `/var/www/myapp`.
2. **Соберите**:

```bash
cd /var/www/myapp

cd client-app && npm install && npm run build && cd ..
dotnet publish -c Release -o ./publish
cp appsettings.Production.json ./publish/ 2>/dev/null || true
```

3. **Миграции** (если меняли модели):

```bash
dotnet ef database update --project . --configuration Release
```

4. **Перезапуск**:

```bash
sudo systemctl restart myapp
```

### 8.3 Деплой с Windows (через WinSCP + PuTTY)

1. Соберите проект локально на Windows:

```powershell
cd "c:\Users\smeta\MyWebApi 1"
cd client-app
npm run build
cd ..
dotnet publish -c Release -o ./publish
```

2. Загрузите через WinSCP папку `publish` в `/var/www/myapp/` (перезаписать).
3. Скопируйте `appsettings.Production.json` в `publish` на сервере.
4. Перезапустите через PuTTY:

```bash
sudo systemctl restart myapp
```

---

## 9. Домен

Ваш домен: **learning.dvsmet.ru**

### Серверы имён (NS) при регистрации

Если панель предлагает настройку NS:

- **«Серверы имен провайдера»** — оставьте включённым (как по умолчанию).
- **Дополнительные NS** — оставьте пустыми. Двух NS (`ns1.hosting-russia.ru`, `ns2.hosting-russia.ru`) достаточно для делегирования.
- Пустые поля NS нужны только тем, кто подключает свои сторонние DNS.

### Настройка DNS (обязательно для домена)

Ошибка `DNS_PROBE_FINISHED_NXDOMAIN` означает: DNS-запись для `learning.dvsmet.ru` ещё не создана.

В панели управления доменом (где куплен dvsmet.ru) найдите раздел **DNS**, **Зона DNS** или **Записи домена** и добавьте A-запись:

| Тип | Имя (хост) | Значение | TTL |
|-----|------------|----------|-----|
| A   | learning   | 95.182.121.83 | 300 |

Сохраните. Подождите 5–30 минут для распространения DNS. После этого `http://learning.dvsmet.ru` будет открываться.

*До настройки DNS используйте `http://95.182.121.83`.*

---

## Чеклист перед деплоем

- [ ] Установить .NET 8, PostgreSQL, Node.js, Nginx
- [ ] Создать БД и пользователя PostgreSQL
- [ ] Создать `appsettings.Production.json` с правильной строкой подключения
- [ ] Собрать фронтенд и бэкенд
- [ ] Выполнить миграции
- [ ] Настроить Nginx
- [ ] Получить SSL сертификат
- [ ] Включить `app.UseHttpsRedirection()` в Program.cs
- [ ] Обновить CORS с production доменом
- [ ] Создать systemd-сервис
- [ ] Открыть порты 80, 443 в firewall

---

## Устранение неполадок

**Приложение не загружается:**

```bash
sudo journalctl -u myapp -n 50 --no-pager
```

**Ошибка подключения к БД:**

- Проверьте `appsettings.Production.json`
- Убедитесь, что PostgreSQL запущен: `sudo systemctl status postgresql`

**502 Bad Gateway:**

- Приложение не запущено: `sudo systemctl start myapp`
- Проверьте, что приложение слушает на `127.0.0.1:5233`

**Сертификат не выдаётся:**

- Убедитесь, что домен указывает на IP сервера
- Порты 80 и 443 должны быть открыты

---

## 10. Git и деплой одним нажатием

Рекомендуемый рабочий процесс: разрабатываете локально → проверяете → деплойте одним скриптом.

### 10.1 Инициализация Git (один раз)

На Windows в папке проекта:

```powershell
cd "c:\Users\smeta\MyWebApi 1"
git init
git add .
git commit -m "Initial commit"
```

### 10.2 Удалённый репозиторий (опционально)

Создайте приватный репозиторий на GitHub/GitLab и привяжите:

```powershell
git remote add origin https://github.com/ваш-логин/mywebapi.git
git push -u origin main
```

*Если репозиторий не нужен — Git всё равно полезен для истории изменений и отката.*

### 10.3 Ежедневный workflow

1. **Разработка** — меняете код локально.
2. **Проверка** — `dotnet run`, `npm run dev`, тестируете.
3. **Коммит** (по желанию):
   ```powershell
   git add .
   git commit -m "Описание изменений"
   git push   # если используете удалённый репозиторий
   ```
4. **Деплой одним нажатием**:
   ```powershell
   .\deploy.ps1
   ```

Скрипт `deploy.ps1`:
- Собирает фронтенд (`npm run build`)
- Собирает бэкенд (`dotnet publish`)
- Загружает на сервер **только изменённые файлы** (если есть WSL + rsync) или полную копию (через scp)
- Перезапускает `myapp`

### 10.4 Параметры deploy.ps1

```powershell
.\deploy.ps1 -SkipBuild    # Только загрузить (если уже собрали)
.\deploy.ps1 -SkipRestart  # Не перезапускать сервис
```

### 10.5 Требования для deploy.ps1

- **PowerShell** (есть в Windows)
- **OpenSSH** (встроен в Windows 10/11): `scp`, `ssh`
- **WSL** (опционально): для `rsync` — загрузка только изменённых файлов, быстрее при частых деплоях

Пароль при `scp`/`ssh` запросится один раз за сессию. Чтобы не вводить пароль каждый раз — настройте [SSH-ключи](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).

### 10.6 Деплой через Git на сервере (альтернатива)

Если весь проект в Git, можно собирать на сервере:

1. На сервере в `/var/www/myapp` выполнить `git pull`.
2. Запустить `./deploy.sh` (см. раздел 8.1).

Тогда `deploy.ps1` не нужен — вы только делаете `git push`, подключаетесь по SSH и запускаете `./deploy.sh`.
