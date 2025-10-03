<?php
require_once __DIR__.'/config.php';
require_once __DIR__.'/db.php';

header('Content-Type: application/json');
if (isset($_SERVER['HTTP_ORIGIN'])) { header("Access-Control-Allow-Origin: ".$_SERVER['HTTP_ORIGIN']); } else { header("Access-Control-Allow-Origin: *"); }
header('Vary: Origin');

$sql = "
  SELECT n.code, COALESCE(n.name, '') AS name, COALESCE(SUM(v.votes),0) AS votes
  FROM nominees n
  LEFT JOIN votes v ON v.nominee_code = n.code AND v.status IN ('success','paid')
  GROUP BY n.code, n.name
  ORDER BY votes DESC, n.code ASC
";
$rows = $pdo->query($sql)->fetchAll();
echo json_encode(['data'=>$rows]);
