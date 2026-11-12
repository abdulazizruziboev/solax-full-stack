#!/usr/bin/env bash
# ==============================================================================
# Solax Full-Stack — Avtomatik Build va Deploy Skripti
# Contabo VPS Server: 169.58.46.136 (https://solar-pro.uz)
# ==============================================================================
set -e

# Terminal ranglari
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Konfiguratsiya
SERVER_USER="root"
SERVER_IP="169.58.46.136"
REMOTE_DIR="/root/solax-full-stack"
LOCAL_DIR="/home/abdulaziz/Desktop/solax-full-stack"
DOMAIN="solar-pro.uz"

log_info()    { echo -e "${BLUE}ℹ [INFO]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✔ [MUVAFFAQ]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠ [OGOHLANTIRISH]${NC} $1"; }
log_error()   { echo -e "${RED}✖ [XATO]${NC} $1" >&2; }

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "    SOLAR PRO (SOLAX FULL-STACK) — BUILD & DEPLOY       "
echo "    Server: Contabo VPS ($SERVER_IP)                     "
echo "=========================================================="
echo -e "${NC}"

# 1. Skript qayerda ishlayotganini aniqlash (Mahalliy kompyuter yoki VPS)
IS_SERVER=false
if [[ "$USER" == "root" && -d "$REMOTE_DIR" ]]; then
  IS_SERVER=true
fi

# Agar argument sifatida --status berilgan bo'lsa
if [[ "$1" == "--status" ]]; then
  log_step "Serverdagi konteynerlar va sayt holatini tekshirish..."
  if [ "$IS_SERVER" = true ]; then
    cd "$REMOTE_DIR"
    docker compose -f docker-compose.prod.yml ps
  else
    ssh -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml ps"
  fi
  HTTP_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/login" || echo "000")
  echo -e "\n${BOLD}Sayt holati (https://$DOMAIN):${NC} HTTP $HTTP_STATUS"
  exit 0
fi

# Agar argument sifatida --logs berilgan bo'lsa
if [[ "$1" == "--logs" ]]; then
  SERVICE="${2:-web}"
  log_step "Server loglarini ko'rish ($SERVICE)..."
  if [ "$IS_SERVER" = true ]; then
    cd "$REMOTE_DIR"
    docker compose -f docker-compose.prod.yml logs -f --tail=100 "$SERVICE"
  else
    ssh -t "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && docker compose -f docker-compose.prod.yml logs -f --tail=100 $SERVICE"
  fi
  exit 0
fi

START_TIME=$(date +%s)

# ==============================================================================
# A) MAHALLIY KOMPYUTERDAN ISHLATILGANDA
# ==============================================================================
if [ "$IS_SERVER" = false ]; then
  log_info "Rejim: Mahalliy kompyuterdan Contabo serverga deploy qilish"

  # Loyiha papkasini topish
  if [ -d "$LOCAL_DIR" ]; then
    TARGET_DIR="$LOCAL_DIR"
  elif [ -f "./docker-compose.prod.yml" ]; then
    TARGET_DIR="$(pwd)"
  else
    log_error "Loyiha papkasi topilmadi: $LOCAL_DIR"
    exit 1
  fi

  cd "$TARGET_DIR"
  log_info "Loyiha papkasi: $TARGET_DIR"

  # 1. Git holatini tekshirish
  log_step "1/4. Mahalliy Git o'zgarishlarini tekshirish va GitHub ga yuklash..."
  GIT_STATUS=$(git status --porcelain)

  if [ -n "$GIT_STATUS" ]; then
    log_info "O'zgarishlar aniqlandi:"
    git status -s
    
    COMMIT_MSG="$1"
    if [ -z "$COMMIT_MSG" ]; then
      COMMIT_MSG="auto-deploy: $(date +'%Y-%m-%d %H:%M:%S')"
    fi
    
    log_info "O'zgarishlar commit qilinmoqda: '$COMMIT_MSG'..."
    git add -A
    git commit -m "$COMMIT_MSG"
  else
    log_info "Mahalliy git toza, yangi commit yo'q."
  fi

  # GitHub ga push qilish
  log_info "GitHub ga yuklanmoqda (git push origin main)..."
  git push origin main || {
    log_warn "Push xatolik berdi yoki allaqachon so'nggi versiyada. Davom etilmoqda..."
  }
  log_success "Git muvaffaqiyatli sinxronlandi!"

  # 2. Contabo VPS ga SSH orqali ulanish va deploy qilish
  log_step "2/4. Contabo serverga ulanish ($SERVER_IP)..."
  ssh -o BatchMode=yes -o ConnectTimeout=8 "$SERVER_USER@$SERVER_IP" "true" || {
    log_error "Serverga SSH orqali ulanib bo'lmadi! Internet yoki SSH kalitni tekshiring."
    exit 1
  }
  log_success "Server bilan aloqa o'rnatildi!"

  log_step "3/4. Serverda yangilash va Docker build jarayoni..."
  ssh -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "bash -se" << 'REMOTE_SCRIPT'
set -e
cd /root/solax-full-stack

echo "▶ Git dan yangi kod tortib olinmoqda..."
git pull origin main

echo "▶ Docker web va worker konteynerlari build qilinmoqda..."
docker compose -f docker-compose.prod.yml build web worker

echo "▶ Yangi konteynerlar ishga tushirilmoqda..."
docker compose -f docker-compose.prod.yml up -d web worker

echo "▶ Eski docker keshlar tozalanmoqda..."
docker image prune -f >/dev/null 2>&1 || true

echo "▶ Konteynerlar holati:"
docker compose -f docker-compose.prod.yml ps
REMOTE_SCRIPT

# ==============================================================================
# B) SERVERNING O'ZIDA ISHLATILGANDA
# ==============================================================================
else
  log_info "Rejim: To'g'ridan-to'g'ri Contabo serverda build va deploy qilish"
  cd "$REMOTE_DIR"

  log_step "1/3. Git dan yangi o'zgarishlarni tortib olish..."
  git pull origin main

  log_step "2/3. Docker web va worker build qilinmoqda..."
  docker compose -f docker-compose.prod.yml build web worker

  log_step "3/3. Konteynerlarni qayta ishga tushirish..."
  docker compose -f docker-compose.prod.yml up -d web worker
  docker image prune -f >/dev/null 2>&1 || true

  echo "▶ Konteynerlar holati:"
  docker compose -f docker-compose.prod.yml ps
fi

# ==============================================================================
# 4. TEKSHIRUV VA XULOSA
# ==============================================================================
log_step "4/4. Sayt ishlayotganini tekshirish (Healthcheck)..."
sleep 2

HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/login" || echo "000")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}${BOLD}==========================================================${NC}"
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}${BOLD}   🎉 DEPLOY MUVAFFAQIYATLI YAKUNLANDI! (${DURATION}s)${NC}"
  echo -e "${GREEN}   🌐 Sayt faol: https://$DOMAIN (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}${BOLD}   ⚠ DEPLOY TUGADI, LEKIN JAVOB KODI: HTTP $HTTP_CODE${NC}"
  echo -e "${YELLOW}   Konteyner ishga tushishi uchun biroz kuting yoki loglarni tekshiring:${NC}"
  echo -e "   ~/build_solax.sh --logs"
fi
echo -e "${GREEN}${BOLD}==========================================================${NC}"
