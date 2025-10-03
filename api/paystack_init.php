<?php
require_once __DIR__.'/config.php';
require_once __DIR__.'/db.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
$voterId = trim($data['voterId'] ?? '');
$code    = strtoupper(trim($data['nomineeCode'] ?? ''));
$votes   = (int)($data['votes'] ?? 0);
$email   = trim($data['email'] ?? '');

if ($votes <= 0 || $code === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400); echo json_encode(['error'=>'Invalid payload']); exit;
}
if (!nomineeExists($pdo, $code)) {
  http_response_code(404); echo json_encode(['error'=>'Nominee not found']); exit;
}

$amount = (int)round($votes * PRICE_PER * 100); // pesewas
$reference = 'LN'.date('YmdHis').bin2hex(random_bytes(3));

// Pre-create vote as pending
$stmt = $pdo->prepare("INSERT INTO votes (voter_id, nominee_code, votes, amount, source, status, reference, ip, user_agent)
                       VALUES (:v, :c, :n, :a, 'WEB', 'pending', :r, :ip, :ua)");
$stmt->execute([
  ':v'=>$voterId ?: null, ':c'=>$code, ':n'=>$votes, ':a'=>($amount/100),
  ':r'=>$reference, ':ip'=>$_SERVER['REMOTE_ADDR'] ?? null,
  ':ua'=>substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 250),
]);

// Init Paystack
$payload = [
  'email'         => $email,
  'amount'        => $amount,
  'reference'     => $reference,
  'callback_url'  => BASE_URL.'/thankyou.html?ref='.$reference,
  'metadata'      => ['nominee_code'=>$code, 'votes'=>$votes, 'voter_id'=>$voterId]
];

$ch = curl_init('https://api.paystack.co/transaction/initialize');
curl_setopt_array($ch, [
  CURLOPT_POST=>true,
  CURLOPT_RETURNTRANSFER=>true,
  CURLOPT_HTTPHEADER=>[
    'Authorization: Bearer '.PAYSTACK_SECRET,
    'Content-Type: application/json'
  ],
  CURLOPT_POSTFIELDS=>json_encode($payload)
]);
$res = curl_exec($ch);
if (curl_errno($ch)) { http_response_code(502); echo json_encode(['error'=>'Paystack init failed']); exit; }
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$out = json_decode($res, true);
if ($status >= 200 && $status < 300 && !empty($out['data']['authorization_url'])) {
  echo json_encode(['auth_url'=>$out['data']['authorization_url'], 'reference'=>$reference]);
} else {
  http_response_code(500); echo json_encode(['error'=>'Unable to initialize transaction']);
}

function nomineeExists(PDO $pdo, string $code): bool {
  $q = $pdo->prepare("SELECT 1 FROM nominees WHERE code = :c LIMIT 1");
  $q->execute([':c'=>$code]);
  return (bool)$q->fetchColumn();
}
