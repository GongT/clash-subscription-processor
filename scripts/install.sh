#!/usr/bin/env bash

set -Eeuo pipefail

cd "$(dirname "$(realpath "${BASH_SOURCE[0]}")")"
cd ..

cat <<-EOF > /etc/systemd/system/clash-subscription-processor.service
[Unit]
Description=clash proxy subscription processor
After=network-online.target pppoe.service dnscache.service
Before=clash.service

[Install]
RequiredBy=clash.service

[Service]
ExecStart=/usr/nodejs/bin/node "$(pwd)/lib/entry.js"
Type=notify
Environment="NODE_ENV=production"
TimeoutStartSec=30
Restart=always
EOF

systemctl daemon-reload
systemctl enable --now clash-subscription-processor.service
