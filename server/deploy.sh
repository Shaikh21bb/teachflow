#!/bin/bash

# Скрипт для деплоя бэкенда на свой сервер (VPS)
# Перед запуском убедитесь, что установлен Node.js и pm2 (npm install -g pm2)

echo "🚀 Начинаем деплой Urpaq.ai Backend..."

# Переходим в папку сервера
cd server

# Устанавливаем зависимости
npm install

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "⚠️ Файл server/.env не найден! Создаю пример..."
    echo "PORT=3001" > .env
    echo "JWT_SECRET=$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")" >> .env
    echo "GEMINI_API_KEY=your_key_here" >> .env
    echo "DATABASE_PATH=./db/urpaq.db" >> .env
    echo "🔔 Пожалуйста, отредактируйте server/.env и добавьте ваши ключи API!"
fi

# Запускаем через PM2
pm2 stop urpaq-backend || true
pm2 start index.js --name urpaq-backend

echo "✅ Бэкенд запущен в фоне через PM2!"
echo "📍 API будет доступно по адресу: http://ваш-ip:3001/api"
