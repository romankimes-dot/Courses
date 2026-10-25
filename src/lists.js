// Plusieurs listes (Maison, Pour Maman, Semaine avec les enfants…) : chacune a ses articles, ses membres,
// son budget et son propre code de partage. Sur le téléphone, chaque liste a son stockage : les clés
// sont suffixées par l'identifiant de la liste (la liste d'origine « main » garde les clés historiques).

const LISTS_KEY = 'courses.lists', CURRENT_LIST = 'courses.list';
const lget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const lput = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let lists = lget(LISTS_KEY, null) || [{ id: 'main', name: 'Maison' }];
let LIST = lget(CURRENT_LIST, 'main');
if (!lists.some(l => l.id === LIST)) LIST = lists[0].id;

const K = name => LIST === 'main' ? name : `${name}:${LIST}`;
const currentList = () => lists.find(l => l.id === LIST);
const saveLists = () => lput(LISTS_KEY, lists);

function newList(name) {
  const l = { id: 'l' + Math.random().toString(36).slice(2, 9), name };
  lists.push(l);
  saveLists();
  return l;
}

// Changer de liste recharge l'app sur le stockage de l'autre liste
function switchList(id) {
  lput(CURRENT_LIST, id);
  location.replace(location.pathname);
}

// Retirer une liste de ce téléphone (les autres membres la gardent)
const PER_LIST = ['courses.v1', 'courses.sync', 'courses.outbox', 'courses.snap', 'courses.seq', 'courses.seen', 'courses.who', 'courses.store', 'courses.invited', 'courses.feed'];
function forgetList(id) {
  try { for (const k of PER_LIST) localStorage.removeItem(id === 'main' ? k : `${k}:${id}`); } catch {}
  lists = lists.filter(l => l.id !== id);
  saveLists();
  switchList(lists[0].id);
}
