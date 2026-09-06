/**
 * Genera 104 semanas (24 meses) de Tu Pulso por Okomos para Panadería El Trigo.
 * Uso: node scripts/seed-demo-panaderia.mjs > /tmp/panaderia-weeks.sql
 */
function mondayUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function getSemanaMes(date) {
  const day = date.getUTCDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

function getFactorCobranza(date) {
  return { 1: 1, 2: 0.75, 3: 0.5, 4: 0.25 }[getSemanaMes(date)];
}

function getSemanasRestantesMes(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.floor((daysInMonth - date.getUTCDate()) / 7);
}

function calcularEgresoPromedio(historial) {
  const validos = historial.filter((v) => Number.isFinite(v) && v >= 0);
  if (validos.length === 0) return 0;
  let muestra = validos.slice(0, 8);
  if (muestra.length >= 3) {
    const sorted = [...muestra].sort((a, b) => a - b);
    muestra = sorted.slice(1, sorted.length - 1);
  }
  return muestra.reduce((s, v) => s + v, 0) / muestra.length;
}

function calcularRunway(historialEgresos, saldo) {
  const semanas = historialEgresos.filter((v) => Number.isFinite(v) && v >= 0);
  if (semanas.length === 0) return 0;
  const gastoMensual = calcularEgresoPromedio(semanas) * 4.33;
  return gastoMensual > 0 ? Math.round((saldo / gastoMensual) * 10) / 10 : 0;
}

function calcularScoreSemanal(inputs, historial, date) {
  const { saldo_bancos_efectivo, egresos_semana, cobranza_pendiente, ventas } = inputs;
  const factorCobranza = getFactorCobranza(date);
  const semanasRestantes = getSemanasRestantesMes(date);
  const egresosConActual = [egresos_semana, ...historial];
  const egresoPromedio = calcularEgresoPromedio(egresosConActual);
  const caja_proyectada = Math.round(
    saldo_bancos_efectivo +
      cobranza_pendiente * factorCobranza -
      egresos_semana -
      (semanasRestantes > 0 ? egresoPromedio * semanasRestantes : 0)
  );
  const runway_meses = calcularRunway(egresosConActual, saldo_bancos_efectivo);
  const margen_real =
    ventas > 0 ? Math.round(((ventas - egresos_semana) / ventas) * 1000) / 10 : 0;
  const score_liquidez = Math.min(100, Math.round((runway_meses / 6) * 100));
  const score_rentabilidad = Math.min(100, Math.max(0, Math.round((margen_real / 30) * 100)));
  const ventasMensualizadas = ventas * 4.33;
  const cobRatio =
    ventasMensualizadas > 0 ? cobranza_pendiente / ventasMensualizadas : cobranza_pendiente > 0 ? 1 : 0;
  const score_planeacion = Math.min(100, Math.max(0, Math.round((1 - cobRatio / 0.5) * 100)));
  const score_general = Math.round((score_liquidez + score_rentabilidad + score_planeacion) / 3);
  return {
    score_liquidez,
    score_rentabilidad,
    score_planeacion,
    score_general,
    runway_meses,
    caja_proyectada,
    margen_real,
  };
}

const lastMonday = mondayUTC(new Date(Date.UTC(2026, 8, 6)));
const weeks = [];
for (let i = 103; i >= 0; i--) weeks.push(addDays(lastMonday, -7 * i));

let cash = 210000;
const historial = [];
const rows = [];

for (const week of weeks) {
  const y = week.getUTCFullYear();
  const m = week.getUTCMonth() + 1;
  const key = iso(week);

  let ventas = 92000 + ((y + m + week.getUTCDate()) % 7) * 1800;
  let egresos = 64000 + ((m + week.getUTCDate()) % 5) * 900;
  let cobranza = 18000 + (m % 3) * 2500;

  if (m === 12) ventas = Math.round(ventas * 1.38);
  if (m === 1) ventas = Math.round(ventas * 0.82);
  if (m === 3 || m === 4) ventas = Math.round(ventas * 1.08);
  if (m === 6 || m === 7) ventas = Math.round(ventas * 0.9);

  // Anomalía 1: harina cara (jun 2025)
  if (key >= "2025-06-02" && key <= "2025-06-23") {
    egresos = Math.round(egresos * 1.42);
  }
  // Anomalía 2: retiro / hueco de caja (ago 2025)
  if (key === "2025-08-11") {
    cash = 78000;
  }
  // Anomalía 3: hotel no paga (feb 2026)
  if (key >= "2026-02-02" && key <= "2026-03-02") {
    cobranza = 128000;
    ventas = Math.round(ventas * 0.94);
  }
  // Anomalía 4: deterioro reciente para que Mario vea alerta
  if (key >= "2026-07-13") {
    ventas = Math.round(ventas * 0.72);
    egresos = Math.round(egresos * 1.12);
    cobranza = Math.max(cobranza, 96000);
  }

  const profit = ventas - egresos;
  cash = Math.max(25000, Math.round(cash + profit * 0.35 - cobranza * 0.04));
  if (key >= "2026-07-13") cash = Math.max(32000, Math.round(cash - 18000));

  const inputs = {
    ventas,
    egresos_semana: egresos,
    saldo_bancos_efectivo: cash,
    cobranza_pendiente: cobranza,
  };
  const score = calcularScoreSemanal(inputs, historial, week);
  historial.unshift(egresos);

  rows.push({
    periodo: key,
    created: `${key}T16:00:00+00`,
    ...inputs,
    ...score,
  });
}

process.stdout.write(
  JSON.stringify(
    rows.map((r) => ({
      periodo_semana: r.periodo,
      created_at: r.created,
      ventas: r.ventas,
      egresos_semana: r.egresos_semana,
      saldo_bancos_efectivo: r.saldo_bancos_efectivo,
      cobranza_pendiente: r.cobranza_pendiente,
      score_liquidez: r.score_liquidez,
      score_rentabilidad: r.score_rentabilidad,
      score_planeacion: r.score_planeacion,
      score_general: r.score_general,
      runway_meses: r.runway_meses,
      caja_proyectada: r.caja_proyectada,
      margen_real: r.margen_real,
    }))
  )
);
process.stderr.write(
  `weeks=${rows.length} last=${rows[rows.length - 1].periodo} score=${rows[rows.length - 1].score_general} cash=${rows[rows.length - 1].saldo_bancos_efectivo}\n`
);
