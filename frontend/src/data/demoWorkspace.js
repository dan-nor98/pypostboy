export const methods = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
};

export const tree = [
  {
    name: 'Payments API',
    open: true,
    children: [
      {name: 'Authentication', open: true, children: [['POST', 'Login'], ['POST', 'Refresh Token']]},
      {name: 'Deposits', open: true, children: [['POST', 'Create Deposit', true], ['GET', 'Deposit Status']]},
      {name: 'Withdrawals', open: false, children: [['POST', 'Create Withdrawal'], ['GET', 'Withdrawal Status']]},
    ],
  },
  {name: 'Internal Admin', open: false, children: [['GET', 'Audit Events'], ['DELETE', 'Revoke Token']]},
];

export const headers = [
  ['Content-Type', 'application/json', 'System'],
  ['Authorization', 'Bearer •••••••••••••••••••••••••••', 'Secret'],
  ['Idempotency-Key', '{{requestId}}', 'Variable'],
];

export const params = [
  ['✓', 'amount', '1000000', 'Transaction amount'],
  ['✓', 'currency', 'TMN', 'Settlement currency'],
  ['', 'reference', '', 'Optional merchant reference'],
];

export const commands = [
  ['New Request', 'Ctrl N'],
  ['Send Active Request', 'Ctrl Enter'],
  ['Format Request Body', 'Shift Alt F'],
  ['Switch Environment', 'Ctrl Shift E'],
  ['Toggle Sidebar', 'Ctrl B'],
];

export const requestBodyLines = [
  '{',
  '  "amount": 1000000,',
  '  "currency": "TMN",',
  '  "callbackUrl": "{{callbackUrl}}",',
  '  "metadata": {',
  '    "customerId": "CUS-4481"',
  '  }',
  '}',
];

export const responseBodyLines = [
  '{',
  '  "transactionId": "DP-10482",',
  '  "status": "pending",',
  '  "amount": 1000000,',
  '  "currency": "TMN",',
  '  "links": { "receipt": "/receipts/DP-10482" }',
  '}',
];
