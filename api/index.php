<?php
// LAINNOV USSD — Arkesel POST (x-www-form-urlencoded) -> plain text "CON/END"
require_once __DIR__.'/config.php';
require_once __DIR__.'/db.php';

// ----- CORS for browser simulator -----
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header("Access-Control-Allow-Origin: ".$_SERVER['HTTP_ORIGIN']);
} else {
  header("Access-Control-Allow-Origin: *");
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Response type
header('Content-type: text/plain; charset=utf-8');

// ---- Arkesel body ----
$sessionId   = isset($_POST['sessionId'])   ? $_POST['sessionId']   : '';
$serviceCode = isset($_POST['serviceCode']) ? $_POST['serviceCode'] : '';
$phoneNumber = isset($_POST['phoneNumber']) ? $_POST['phoneNumber'] : '';
$text        = isset($_POST['text'])        ? trim((string)$_POST['text']) : '';

// Parse
$parts = ($text === '') ? [] : explode('*', $text);
$level = count($parts);

// Step 0 — ask code
if ($level === 0) { echo "CON Enter Nominee Code"; exit; }

$code = strtoupper(trim($parts[0]));

// Step 1 — validate code (DB only)
if ($level === 1) {
  if (!nomineeExists($pdo, $code)) {
    echo "CON Nominee code not found.\nEnter Nominee Code"; exit;
  }
  echo "CON Enter Number of votes"; exit;
}

// Step 2 — get votes, compute amount
if ($level === 2) {
  if (!nomineeExists($pdo, $code)) {
    echo "CON Nominee code not found.\nEnter Nominee Code"; exit;
  }
  $votesRaw = trim($parts[1]);
  if ($votesRaw === '' || !ctype_digit($votesRaw) || intval($votesRaw) <= 0) {
    echo "CON Invalid number. Enter Number of votes (digits only)"; exit;
  }
  $votes = intval($votesRaw);
  $total = number_format($votes * PRICE_PER, 2);
  echo "CON You are about to pay GHS {$total} to ".BRAND." for {$code}.\n1. Yes\n2. No"; exit;
}

// Step 3 — confirm/cancel
if ($level >= 3) {
  $choice = strtolower(trim($parts[2]));
  if ($choice === '1' || $choice === 'y' || $choice === 'yes')) {
    // Log as successful USSD vote (cash/airtime/etc. handled externally)
    $votes = intval($parts[1]);
    $amount = round($votes * PRICE_PER, 2);
    try {
      $stmt = $pdo->prepare("INSERT INTO votes (voter_id, msisdn, nominee_code, votes, amount, source, status, session_id, ip, user_agent)
                             VALUES (:voter_id, :msisdn, :code, :votes, :amount, 'USSD', 'success', :sid, :ip, :ua)");
      $stmt->execute([
        ':voter_id' => null,
        ':msisdn'   => $phoneNumber ?: null,
        ':code'     => $code,
        ':votes'    => $votes,
        ':amount'   => $amount,
        ':sid'      => $sessionId ?: null,
        ':ip'       => $_SERVER['REMOTE_ADDR'] ?? null,
        ':ua'       => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 250),
      ]);
    } catch(Throwable $e) { /* must still return to Arkesel */ }
    echo "END Successful"; exit;
  }
  if ($choice === '2' || $choice === 'n' || $choice === 'no') {
    echo "END Transaction cancelled"; exit;
  }
  echo "CON Invalid choice.\n1. Yes\n2. No"; exit;
}

echo "END Invalid request"; exit;

// ---------- Helpers ----------
function nomineeExists(PDO $pdo, string $code): bool {
  $q = $pdo->prepare("SELECT 1 FROM nominees WHERE code = :c LIMIT 1");
  $q->execute([':c'=>$code]);
  return (bool)$q->fetchColumn();
}
