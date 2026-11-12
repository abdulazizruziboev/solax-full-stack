#!/usr/bin/env bash
# ==============================================================================
# CPMToolUz (app-tool.solar-pro.uz / cpmtool.uz) — Build & Deploy Skripti
# Contabo VPS Server: 169.58.46.136
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
CPMTOOL_DIR="/root/cpmtooluz"
COMPOSE_DIR="/root/solax-full-stack"
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE_NAME="cpmtool_web"
DOMAIN="app-tool.solar-pro.uz"

log_info()    { echo -e "${BLUE}ℹ [INFO]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}${BOLD}▶ $1${NC}"; }
log_success() { echo -e "${GREEN}✔ [MUVAFFAQ]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠ [OGOHLANTIRISH]${NC} $1"; }
log_error()   { echo -e "${RED}✖ [XATO]${NC} $1" >&2; }

echo -e "${CYAN}${BOLD}"
echo "=========================================================="
echo "    CPMTOOLUZ (APP-TOOL) — BUILD & DEPLOY               "
echo "    Server: Contabo VPS (169.58.46.136)                   "
echo "=========================================================="
echo -e "${NC}"

# 1. Holatni tekshirish argumenti: --status
if [[ "$1" == "--status" ]]; then
  log_step "Konteyner va sayt holatini tekshirish..."
  cd "$COMPOSE_DIR"
  docker compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME"
  HTTP_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
  echo -e "\n${BOLD}Sayt holati (https://$DOMAIN):${NC} HTTP $HTTP_STATUS"
  exit 0
fi

# 2. Faqat loglarni ko'rish argumenti: --logs
if [[ "$1" == "--logs" ]]; then
  log_step "Konteyner loglarini jonli kuzatish ($SERVICE_NAME)..."
  cd "$COMPOSE_DIR"
  docker compose -f "$COMPOSE_FILE" logs -f --tail=100 "$SERVICE_NAME"
  exit 0
fi

START_TIME=$(date +%s)

# 1-QADAM: Git yangilanishlarini tortib olish
log_step "1/4. Git dan yangi o'zgarishlarni tortib olish ($CPMTOOL_DIR)..."
if [ ! -d "$CPMTOOL_DIR" ]; then
  log_error "Loyiha papkasi topilmadi: $CPMTOOL_DIR"
  exit 1
fi

cd "$CPMTOOL_DIR"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  log_info "Hozirgi tarmoq: '$CURRENT_BRANCH'. 'main' tarmog'iga o'tilmoqda..."
  git checkout main || true
fi

log_info "Git pull origin main bajarilmoqda..."
git pull origin main
log_success "Git o'zgarishlari muvaffaqiyatli yuklandi!"

# 2-QADAM: Docker orqali cpmtool_web konteynerini build qilish
log_step "2/4. Docker orqali $SERVICE_NAME build qilinmoqda..."
cd "$COMPOSE_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  log_error "Docker Compose fayli topilmadi: $COMPOSE_DIR/$COMPOSE_FILE"
  exit 1
fi

docker compose -f "$COMPOSE_FILE" build "$SERVICE_NAME"
log_success "Docker image muvaffaqiyatli build qilindi!"

# 3-QADAM: Konteynerni yangilab ishga tushirish
log_step "3/4. Yangi konteynerni ishga tushirish..."
docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"

# Eski keshlarni tozalash
docker image prune -f >/dev/null 2>&1 || true
log_success "Konteyner ishga tushirildi va eski keshlar tozalandi!"

# 4-QADAM: Konteyner va sayt holatini tekshirish (Healthcheck)
log_step "4/4. Konteyner va sayt holatini tekshirish (Healthcheck)..."
sleep 3

echo -e "\n${BOLD}Konteyner holati:${NC}"
docker compose -f "$COMPOSE_FILE" ps "$SERVICE_NAME"

HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" || echo "000")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}${BOLD}==========================================================${NC}"
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "301" ] || [ "$HTTP_CODE" == "302" ]; then
  echo -e "${GREEN}${BOLD}   🎉 DEPLOY MUVAFFAQIYATLI YAKUNLANDI! (${DURATION}s)${NC}"
  echo -e "${GREEN}   🌐 Sayt faol: https://$DOMAIN (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}${BOLD}   ⚠ DEPLOY TUGADI, LEKIN JAVOB KODI: HTTP $HTTP_CODE${NC}"
  echo -e "${YELLOW}   Konteyner ishga tushishi uchun biroz kuting yoki loglarni tekshiring:${NC}"
  echo -e "   ./build_web.sh --logs"
fi
echo -e "${GREEN}${BOLD}==========================================================${NC}"

# So'nggi 25 qator loglarni ko'rsatish
echo -e "\n${BOLD}So'nggi loglar ($SERVICE_NAME):${NC}"
docker compose -f "$COMPOSE_FILE" logs --tail=25 "$SERVICE_NAME"

echo -e "\n${CYAN}💡 Loglarni jonli kuzatish uchun: ${BOLD}./build_web.sh --logs${NC}"
