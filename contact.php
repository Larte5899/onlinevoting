<?php
// Basic PHP mail handler (Hostinger). Replace $to with your email.
$to = 'hello@example.com'; // TODO: your address
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
  http_response_code(400);
  echo "<p>Invalid submission. Go back and try again.</p>";
  exit;
}

$subject = "New message from LAINNOV Voting website";
$body = "From: $name <$email>\n\n$message";
$headers = "From: LAINNOV Website <no-reply@" . $_SERVER['HTTP_HOST'] . ">\r\n" .
           "Reply-To: $email\r\n";

if (@mail($to, $subject, $body, $headers)) {
  echo "<p>Thanks, $name. We’ll get back to you.</p><p><a href='index.html'>Return home</a></p>";
} else {
  echo "<p>Message could not be sent. Please email <a href='mailto:$to'>$to</a>.</p>";
}
