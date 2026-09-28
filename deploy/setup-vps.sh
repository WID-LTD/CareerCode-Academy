#!/bin/bash
# Idempotent VPS provisioning for careercode-prod (Ubuntu 24.04 ARM).
# Run once as a sudo-capable user:  bash deploy/setup-vps.sh
set -euo pipefail

APP_USER="careercode"
APP_DIR="/srv/careercode"
REPO_URL="https://github.com/WID-LTD/CareerCode-Academy.git"

echo "==> Updating apt and installing base packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  curl git ufw fail2ban rsync debian-keyring debian-archive-keyring apt-transport-https > /dev/null

echo "==> Installing Node.js 20 (ARM64)"
if ! command -v node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - > /dev/null
  sudo apt-get install -y -qq nodejs
fi
node --version

echo "==> Installing Caddy"
if ! command -v caddy > /dev/null; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
fi
caddy version

echo "==> Creating app user and directories"
if ! id "$APP_USER" > /dev/null 2>&1; then
  sudo useradd -m -s /bin/bash "$APP_USER"
fi
sudo mkdir -p "$APP_DIR"/{frontend,backend} /var/log/careercode
sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR" /var/log/careercode

echo "==> Configuring host firewall (second layer; OCI security list is first)"
sudo ufw --force reset > /dev/null
sudo ufw default deny incoming > /dev/null
sudo ufw default allow outgoing > /dev/null
sudo ufw allow 22/tcp comment 'SSH' > /dev/null
sudo ufw allow 80/tcp comment 'HTTP' > /dev/null
sudo ufw allow 443/tcp comment 'HTTPS' > /dev/null
sudo ufw allow 3478/tcp comment 'TURN' > /dev/null
sudo ufw allow 3478/udp comment 'TURN' > /dev/null
sudo ufw allow 7881/tcp comment 'LiveKit TCP fallback' > /dev/null
sudo ufw allow 50000:50100/udp comment 'LiveKit media' > /dev/null
sudo ufw --force enable > /dev/null
sudo ufw status numbered | head -20

echo "==> Cloning repo (deploy key / https)"
if [ ! -d "$APP_DIR/repo/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR/repo"
fi

echo "==> Installing Caddyfile (review domains first!)"
echo "Next: copy deploy/Caddyfile to /etc/caddy/Caddyfile, then run deploy/deploy.sh"
echo "DONE."
