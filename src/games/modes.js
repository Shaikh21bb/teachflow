const localized = (value, language) => value[language === "kk" ? 1 : 0];

const modes = {
  arena: {
    id: "arena",
    brand: "BILIM ARENA",
    name: ["Арена знаний", "Білім аренасы"],
    category: ["Командная викторина", "Командалық викторина"],
    description: [
      "Правильный ответ открывает боевой приём. Побеждает команда, сохранившая больше энергии.",
      "Дұрыс жауап жауынгерлік әдісті ашады. Энергиясы көп қалған команда жеңеді.",
    ],
    teams: [
      ["Бірлік", "Бірлік"],
      ["Жалын", "Жалын"],
    ],
    metric: ["HP", "HP"],
    stageLabel: ["Арена", "Арена"],
    done: ["Атака выполнена", "Шабуыл орындалды"],
    actions: [
      { id: "strike", icon: "swords", label: ["Удар", "Соққы"] },
      { id: "kick", icon: "footprints", label: ["Рывок", "Серпіліс"] },
      { id: "burst", icon: "flame", label: ["Импульс", "Импульс"] },
    ],
  },
  garden: {
    id: "garden",
    brand: "BILIM GARDEN",
    name: ["Сад знаний", "Білім бағы"],
    category: ["Командное выращивание", "Командалық өсіру"],
    description: [
      "Отвечайте вместе и выращивайте дерево команды — от первого ростка до цветущей кроны.",
      "Бірге жауап беріп, команда ағашын алғашқы өскіннен жайқалған тәжге дейін өсіріңіз.",
    ],
    teams: [
      ["Солнце", "Күн"],
      ["Дождь", "Жаңбыр"],
    ],
    metric: ["рост", "өсу"],
    stageLabel: ["Сад знаний", "Білім бағы"],
    done: ["Растение выросло", "Өсімдік өсті"],
    actions: [
      { id: "water", icon: "droplets", label: ["Полить", "Суару"] },
      { id: "sun", icon: "sun", label: ["Солнечный свет", "Күн сәулесі"] },
      { id: "bloom", icon: "sprout", label: ["Цветение", "Гүлдету"] },
    ],
  },
  word: {
    id: "word",
    brand: "SOZ SPRINT",
    name: ["Словарный спринт", "Сөз жарысы"],
    category: ["Термины и переводы", "Терминдер мен аудармалар"],
    description: [
      "Добавьте свои пары слов. Команды находят значения и продвигаются к финишу.",
      "Өз сөз жұптарыңызды қосыңыз. Командалар мағынаны тауып, мәреге жылжиды.",
    ],
    teams: [
      ["Сапфир", "Сапфир"],
      ["Маржан", "Маржан"],
    ],
    metric: ["путь", "жол"],
    stageLabel: ["Словарная трасса", "Сөз жолы"],
    done: ["Команда продвинулась", "Команда алға жылжыды"],
    actions: [],
  },
};

export const gameModeIds = Object.keys(modes);

export function getGameMode(id = "arena", language = "ru") {
  const source = modes[id] || modes.arena;
  return {
    ...source,
    name: localized(source.name, language),
    category: localized(source.category, language),
    description: localized(source.description, language),
    teams: source.teams.map((team) => localized(team, language)),
    metric: localized(source.metric, language),
    stageLabel: localized(source.stageLabel, language),
    done: localized(source.done, language),
    actions: source.actions.map((action) => ({
      ...action,
      label: localized(action.label, language),
    })),
  };
}
