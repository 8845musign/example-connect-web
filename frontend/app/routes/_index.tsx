import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "リアルタイムモニタリングダッシュボード" },
    { name: "description", content: "Connect-web ストリーミングデモ" },
  ];
};

export default function Index() {
  return (
    <div className="container">
      <h1>リアルタイムモニタリングダッシュボード</h1>
      <p>Connect-webとReact Router v7を使用したストリーミングデモです。</p>
      
      <nav className="dashboard-nav">
        <h2>ダッシュボード</h2>
        <ul>
          <li>
            <Link to="/metrics">
              <h3>メトリクスモニター</h3>
              <p>CPU、メモリ、ネットワークなどのリアルタイムメトリクスを表示</p>
            </Link>
          </li>
          <li>
            <Link to="/logs">
              <h3>ログビューア</h3>
              <p>アプリケーションログのリアルタイムストリーミング</p>
            </Link>
          </li>
          <li>
            <Link to="/interactive">
              <h3>インタラクティブクエリ</h3>
              <p>双方向ストリーミングでフィルターを動的に変更</p>
            </Link>
          </li>
        </ul>
      </nav>

      <section className="features">
        <h2>機能</h2>
        <ul>
          <li>Server Streaming RPC - サーバーからクライアントへの一方向ストリーミング</li>
          <li>Bidirectional Streaming RPC - 双方向のリアルタイム通信</li>
          <li>Unary RPC - 通常のリクエスト/レスポンス通信</li>
          <li>Protocol Buffersによる型安全な通信</li>
          <li>React Router v7のファイルベースルーティング</li>
        </ul>
      </section>
    </div>
  );
}