export default function MetricsIndex() {
  return (
    <div className="metrics-welcome">
      <h2>メトリクスを選択してください</h2>
      <p>左側のナビゲーションからモニタリングしたいメトリクスタイプを選択してください。</p>
      <p>選択したメトリクスのリアルタイムデータがストリーミングで表示されます。</p>
      
      <div className="features-list">
        <h3>機能</h3>
        <ul>
          <li>リアルタイムデータストリーミング</li>
          <li>動的なグラフ表示</li>
          <li>メトリクスサマリー表示</li>
          <li>ラベルベースのフィルタリング</li>
        </ul>
      </div>
    </div>
  );
}