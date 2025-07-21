#!/bin/bash

echo "🚀 Connect-Web Streaming Demo セットアップ"
echo "======================================="

# 依存関係のインストール
echo "📦 依存関係をインストール中..."
npm install

cd backend
npm install
cd ..

cd frontend
npm install
cd ..

# Protocol Buffers コード生成
echo "🔧 Protocol Buffers コードを生成中..."
npm run proto:generate

# 開発サーバーの起動
echo "✨ 開発サーバーを起動中..."
echo "📡 Backend: http://localhost:8080"
echo "🌐 Frontend: http://localhost:3000"
echo ""
npm run dev