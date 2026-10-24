/**
 * Модуль взаимодействия с localStorage (с поддержкой нескольких словарей и автозагрузкой из папки vocab/)
 */
const StorageModule = (() => {
  const MAIN_STORAGE_KEY = 'word_know_data';
  const OLD_STORAGE_KEY = 'word_know_pairs'; // Старый ключ для миграции

  // Список файлов по умолчанию, которые нужно подтянуть из папки vocab/
  const DEFAULT_DICTIONARIES_FILES = [
    { path: './vocab/dictHTML.json', defaultName: 'HTML & CSS Базовый' },
    { path: './vocab/css_scss.json', defaultName: 'CSS & SCSS Глубокий' },
    { path: './vocab/javascript_basic.json', defaultName: 'JavaScript Основы' },
    { path: './vocab/svelte_5.json', defaultName: 'Svelte 5' }
  ];

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

  // Получить все слова АКТИВНОГО словаря
  const getWords = () => {
    const data = getData();
    return data.dictionaries[data.activeDictionaryId]?.words || [];
  };

  // Сохранить полный массив слов в АКТИВНЫЙ словарь
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

  // Автоматическая загрузка ВСЕХ файлов словарей из папки vocab/ при первом пуске (или если словарей мало)
  const initDefaultWords = async () => {
    const data = getData();

    // Проверяем: если у нас всего один словарь и он пустой, либо словарей вообще мало
    const dictKeys = Object.keys(data.dictionaries);
    const isFirstRunEmpty = dictKeys.length === 1 && data.dictionaries[dictKeys[0]].words.length === 0;

    if (isFirstRunEmpty) {
      // Удаляем пустой начальный авто-словарь, раз мы будем загружать реальные файлы
      const emptyId = dictKeys[0];
      let firstLoadedId = null;

      for (const fileInfo of DEFAULT_DICTIONARIES_FILES) {
        try {
          const response = await fetch(fileInfo.path);
          if (response.ok) {
            const fileData = await response.json();
            let wordsArray = [];
            let dictName = fileInfo.defaultName;

            if (Array.isArray(fileData)) {
              wordsArray = fileData;
            } else if (fileData && typeof fileData === 'object' && Array.isArray(fileData.words)) {
              wordsArray = fileData.words;
              if (fileData.name) dictName = fileData.name;
            }

            if (wordsArray.length > 0) {
              const validWords = wordsArray.map(item => ({
                id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 4),
                word: item.word.trim(),
                translation: item.translation.trim(),
                consecutiveCorrect: item.consecutiveCorrect || 0,
                errorsCount: item.errorsCount || 0,
                correctCount: item.correctCount || 0,
                isLearned: !!item.isLearned
              }));

              const newDictId = 'dict_file_' + Date.now() + Math.random().toString(36).substr(2, 3);
              data.dictionaries[newDictId] = {
                id: newDictId,
                name: dictName,
                words: validWords
              };

              if (!firstLoadedId) {
                firstLoadedId = newDictId;
              }
              console.log(`Словарь "${dictName}" успешно загружен из ${fileInfo.path}`);
            }
          }
        } catch (e) {
          console.log(`Не удалось загрузить файл ${fileInfo.path} (проверьте запуск через локальный сервер).`);
        }
      }

      // Если удалось загрузить файлы, делаем первый из них активным и удаляем пустой временный
      if (firstLoadedId) {
        delete data.dictionaries[emptyId];
        data.activeDictionaryId = firstLoadedId;
        saveData(data);

        // Обновляем интерфейс, если он уже отрисован
        if (typeof UIModule !== 'undefined' && UIModule.renderDictionary) {
          UIModule.renderDictionary();
        }
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
    createDirectory: createDictionary, // синоним на всякий случай
    createDictionary,
    deleteDictionary,
    importDictionaryJSON
  };
})();