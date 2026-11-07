/* Muscules — combate local de prueba. Sin Supabase ni sincronización entre dispositivos. */
(() => {
  'use strict';
  const KEY = 'muscules_combate_carrotnero_v01';
  const HERO_KEY = 'muscules_neo_stats_v01';
  const DURATION = 24 * 60 * 60 * 1000;
  const ENEMY = { id:'carrotnero', name:'Carrotñero', hp:45, atk:8, xp:30, armor:3 };
  const $ = id => document.getElementById(id);
  const now = () => Date.now();
  const rollD20 = () => Math.floor(Math.random() * 20) + 1;
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const save = (key,value) => localStorage.setItem(key, JSON.stringify(value));
  const initialHero = () => ({ hp:28, maxHp:28, atk:35, xp:9400 });
  let hero = read(HERO_KEY) || initialHero();
  // El progreso persiste en ESTE navegador; la futura versión Supabase será la autoridad.
  let battle = read(KEY);
  if (!battle) {
    battle = { id:'demo-carrotnero-001', startedAt:now(), expiresAt:now()+DURATION, enemyHp:ENEMY.hp, heroHp:hero.hp, status:'active', round:0, claimed:false, message:'¡Carrotñero te desafía! Neo ataca primero.' };
    save(KEY,battle);
  }
  const persist = () => { save(KEY,battle); save(HERO_KEY,hero); };
  const expireIfNeeded = () => {
    if (battle.status === 'active' && now() >= battle.expiresAt) {
      battle.status='lost'; battle.reason='time'; battle.message='¡Se acabaron las 24 horas! Carrotñero escapó.'; persist();
    }
  };
  const render = () => {
    expireIfNeeded();
    const remaining = Math.max(0,battle.expiresAt-now());
    const hh = Math.floor(remaining/3600000), mm=Math.floor(remaining%3600000/60000), ss=Math.floor(remaining%60000/1000);
    $('timer').textContent = [hh,mm,ss].map(v=>String(v).padStart(2,'0')).join(':');
    document.querySelector('.timer').classList.toggle('danger',remaining<3600000);
    $('battle').hidden = battle.status !== 'active';
    $('win').hidden = battle.status !== 'won';
    $('lose').hidden = battle.status !== 'lost';
    $('enemy-hp').textContent=`${battle.enemyHp}/${ENEMY.hp}`;
    $('enemy-bar').style.width=`${100*battle.enemyHp/ENEMY.hp}%`;
    $('hero-hp').textContent=`${battle.heroHp}/${hero.maxHp} HP`;
    $('hero-bar').style.width=`${100*battle.heroHp/hero.maxHp}%`;
    $('log').textContent=battle.message;
    $('roll').disabled = battle.status !== 'active' || battle.heroHp <= 0;
    $('claim').disabled = battle.claimed;
    $('claim').textContent = battle.claimed ? 'Reclamado ✓' : 'Reclamar';
    $('claim-status').textContent = battle.claimed ? `XP total: ${hero.xp}` : '';
    $('lose-reason').textContent = battle.reason === 'time' ? 'Tiempo agotado' : 'Fallecido';
    $('lose-detail').textContent = battle.reason === 'time' ? 'Carrotñero escapó · Sin penalización de XP' : '0 HP · Esperando a sexy dm para revivir';
  };
  $('roll').addEventListener('click',()=>{
    expireIfNeeded(); if (battle.status !== 'active') {render();return;}
    if (battle.heroHp <= 0) {battle.status='lost';battle.reason='hp';persist();render();return;}
    const neoRoll=rollD20();
    const neoDamage=Math.max(1,Math.floor(neoRoll/2)+7-3);
    battle.enemyHp=Math.max(0,battle.enemyHp-neoDamage);
    battle.round++;
    if (battle.enemyHp === 0) {
      battle.status='won';battle.message=`Ronda ${battle.round}: Neo sacó ${neoRoll}, hizo ${neoDamage} de daño. ¡Victoria!`;
    } else {
      const enemyRoll=rollD20();
      const enemyDamage=Math.max(1,Math.floor(enemyRoll/4)+3);
      battle.heroHp=Math.max(0,battle.heroHp-enemyDamage);
      hero.hp=battle.heroHp;
      battle.message=`Ronda ${battle.round}: Neo 🎲${neoRoll} → ${neoDamage} daño. Carrotñero 🎲${enemyRoll} → ${enemyDamage} daño.`;
      if(battle.heroHp===0){battle.status='lost';battle.reason='hp';battle.message+=' Neo ha caído.';}
    }
    hero.hp=battle.heroHp;persist();render();
  });
  $('claim').addEventListener('click',()=>{
    expireIfNeeded();
    if(battle.status!=='won'||battle.claimed){render();return;}
    battle.claimed=true;hero.xp+=ENEMY.xp;persist();render();
  });
  $('reset').addEventListener('click',()=>{
    if(!confirm('¿Reiniciar este combate de prueba? El HP se restaurará al valor de antes de la demo (28).'))return;
    hero.hp=hero.maxHp;
    battle={id:'demo-carrotnero-001',startedAt:now(),expiresAt:now()+DURATION,enemyHp:ENEMY.hp,heroHp:hero.hp,status:'active',round:0,claimed:false,message:'¡Carrotñero te desafía! Neo ataca primero.'};
    persist();render();
  });
  // Para probar victoria/derrota sin esperar 24h desde la consola: MusculesDemo.expire()
  window.MusculesDemo={ expire:()=>{battle.expiresAt=now()-1;persist();render();}, reset:()=>{$('reset').click()}, state:()=>structuredClone({hero,battle}) };
  render();setInterval(render,1000);
})();
