<?php
// ==== ENV (fill these) ====
define('DB_HOST', 'localhost');
define('DB_NAME', 'lainnov_voting');
define('DB_USER', 'YOUR_DB_USER');
define('DB_PASS', 'YOUR_DB_PASS');

define('PAYSTACK_PUBLIC', 'pk_live_xxx'); // or pk_test_xxx
define('PAYSTACK_SECRET', 'sk_live_xxx'); // or sk_test_xxx
define('BASE_URL', 'https://lainnov.com'); // no trailing slash

// Business
define('PRICE_PER', 0.50);               // GHS per vote
define('BRAND', 'LAINNOV Consult');      // payee label
