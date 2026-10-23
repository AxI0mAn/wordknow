/**
 * Модуль взаимодействия с localStorage (с поддержкой нескольких словарей)
 */
const StorageModule = (() => {
  const MAIN_STORAGE_KEY = 'aura_vocab_data';
  const OLD_STORAGE_KEY = 'aura_vocab_pairs'; // Старый ключ для миграции

  // Инициализация структуры и миграция старых данных
  const initStorage = () => {
    let data = localStorage.getItem(MAIN_STORAGE_KEY);
    if (!data) {
      // Пытаемся мигрировать со старого ключа, если он был
      const oldData = localStorage.getItem(OLD_STORAGE_KEY);
      let initialWords = [];

      if (oldData) {
        try {
          const parsedOld = JSON.parse(oldData);
          if (Array.isArray(parsedOld)) {
            initialWords = parsedOld;
          }
        } catch (e) {
          console.error('Ошибка миграции старых данных', e);
        }
        localStorage.removeItem(OLD_STORAGE_KEY);
      }

      const defaultId = 'dict_' + Date.now();
      const initialData = {
        activeDictionaryId: defaultId,
        dictionaries: {
          [defaultId]: {
            id: defaultId,
            name: initialWords.length > 0 ? 'Мой старый словарь' : 'Основной словарь',
            words: initialWords
          }
        }
      };
      localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(initialData));
    }
  };

  // Получить всё состояние
  const getData = () => {
    initStorage();
    return JSON.parse(localStorage.getItem(MAIN_STORAGE_KEY));
  };

  // Сохранить всё состояние
  const saveData = (data) => {
    localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(data));
  };

  // Получить список всех словарей (для выпадающего списка)
  const getDictionariesList = () => {
    const data = getData();
    return Object.values(data.dictionaries).map(d => ({
      id: d.id,
      name: d.name,
      count: d.words.length,
      isActive: d.id === data.activeDictionaryId
    }));
  };

  // Получить ID активного словаря
  const getActiveDictionaryId = () => {
    return getData().activeDictionaryId;
  };

  // Переключить активный словарь
  const setActiveDictionary = (id) => {
    const data = getData();
    if (data.dictionaries[id]) {
      data.activeDictionaryId = id;
      saveData(data);
      return true;
    }
    return false;
  };

  // Создать новый пустой словарь
  const createDictionary = (name) => {
    const data = getData();
    const newId = 'dict_' + Date.now();
    data.dictionaries[newId] = {
      id: newId,
      name: name.trim() || 'Новый словарь',
      words: []
    };
    data.activeDictionaryId = newId;
    saveData(data);
    return newId;
  };

  // Удалить словарь
  const deleteDictionary = (id) => {
    const data = getData();
    const keys = Object.keys(data.dictionaries);
    if (keys.length <= 1) {
      alert('Нельзя удалить последний оставшийся словарь!');
      return false;
    }

    delete data.dictionaries[id];
    if (data.activeDictionaryId === id) {
      data.activeDictionaryId = Object.keys(data.dictionaries)[0];
    }

    saveData(data);
    return true;
  };

  // Получить все слова АКТИВНОГО словаря (полная совместимость со старым методом)
  const getWords = () => {
    const data = getData();
    return data.dictionaries[data.activeDictionaryId]?.words || [];
  };

  // Сохранить полный массив слов в АКТИВНЫЙ словарь (полная совместимость)
  const saveWords = (words) => {
    const data = getData();
    if (data.dictionaries[data.activeDictionaryId]) {
      data.dictionaries[data.activeDictionaryId].words = words;
      saveData(data);
    }
  };

  // Добавить одно новое слово в активный словарь
  const addWord = (word, translation) => {
    const words = getWords();
    if (words.length >= 1000) {
      alert('Достигнут лимит в 1000 слов!');
      return false;
    }

    const newPair = {
      id: Date.now().toString(),
      word: word.trim(),
      translation: translation.trim(),
      consecutiveCorrect: 0,
      errorsCount: 0,
      correctCount: 0,
      isLearned: false
    };

    words.push(newPair);
    saveWords(words);
    return true;
  };

  // Удалить слово из активного словаря
  const deleteWord = (id) => {
    let words = getWords();
    words = words.filter(w => w.id !== id);
    saveWords(words);
  };

  // Обновить конкретное слово в активном словаре
  const updateWord = (updatedWord) => {
    const words = getWords();
    const index = words.findIndex(w => w.id === updatedWord.id);
    if (index !== -1) {
      words[index] = updatedWord;
      saveWords(words);
    }
  };

  // Импорт массива слов из JSON (добавляет к текущему активному словарю)
  const importJSON = (jsonData) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!Array.isArray(parsed)) return false;

      const current = getWords();
      const validNewPairs = parsed.filter(item => item.word && item.translation).map(item => ({
        id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
        word: item.word.trim(),
        translation: item.translation.trim(),
        consecutiveCorrect: item.consecutiveCorrect || 0,
        errorsCount: item.errorsCount || 0,
        correctCount: item.correctCount || 0,
        isLearned: !!item.isLearned
      }));

      const combined = [...current, ...validNewPairs].slice(0, 1000);
      saveWords(combined);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Импорт целого словаря из файла (создает новый словарь с именем файла)
  const importDictionaryJSON = (jsonData, dictName = 'Импортированный словарь') => {
    try {
      const parsed = JSON.parse(jsonData);
      let wordsArray = [];
      let name = dictName;

      if (Array.isArray(parsed)) {
        wordsArray = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.words)) {
        wordsArray = parsed.words;
        if (parsed.name) name = parsed.name;
      } else {
        return false;
      }

      const validWords = wordsArray.filter(item => item.word && item.translation).map(item => ({
        id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
        word: item.word.trim(),
        translation: item.translation.trim(),
        consecutiveCorrect: item.consecutiveCorrect || 0,
        errorsCount: item.errorsCount || 0,
        correctCount: item.correctCount || 0,
        isLearned: !!item.isLearned
      })).slice(0, 1000);

      const data = getData();
      const newId = 'dict_' + Date.now();

      data.dictionaries[newId] = {
        id: newId,
        name: name,
        words: validWords
      };
      data.activeDictionaryId = newId;
      saveData(data);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Проверка и автозагрузка dictHTML.json, если словарей вообще нет или активный пустой
  const initDefaultWords = async () => {
    const currentWords = getWords();
    if (currentWords.length === 0) {
      try {
        const response = await fetch('./dictHTML.json');
        if (response.ok) {
          const fileData = await response.json();
          let wordsArray = [];
          let dictName = 'HTML & CSS Словарь';

          if (Array.isArray(fileData)) {
            wordsArray = fileData;
          } else if (fileData && typeof fileData === 'object' && Array.isArray(fileData.words)) {
            wordsArray = fileData.words;
            if (fileData.name) dictName = fileData.name;
          }

          if (wordsArray.length > 0) {
            const data = getData();
            const activeId = data.activeDictionaryId;
            if (data.dictionaries[activeId]) {
              data.dictionaries[activeId].name = dictName;
              data.dictionaries[activeId].words = wordsArray.map(item => ({
                id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
                word: item.word.trim(),
                translation: item.translation.trim(),
                consecutiveCorrect: item.consecutiveCorrect || 0,
                errorsCount: item.errorsCount || 0,
                correctCount: item.correctCount || 0,
                isLearned: !!item.isLearned
              }));
              saveData(data);
              console.log('Дефолтный словарь успешно загружен из dictHTML.json');
            }
          }
        }
      } catch (e) {
        console.log('Автоматическая загрузка dictHTML.json пропущена (требуется локальный сервер/Live Server).');
      }
    }
  };

  return {
    getWords,
    saveWords,
    addWord,
    deleteWord,
    updateWord,
    importJSON,
    initDefaultWords,
    getDictionariesList,
    getActiveDictionaryId,
    setActiveDictionary,
    createDictionary,
    deleteDictionary,
    importDictionaryJSON
  };
})();