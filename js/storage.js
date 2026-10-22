/**
 * Модуль взаимодействия с localStorage
 */
const StorageModule = (() => {
  const STORAGE_KEY = 'aura_vocab_pairs';

  // Получить все слова
  const getWords = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  };

  // Сохранить полный массив слов
  const saveWords = (words) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  };

  // Добавить одно новое слово
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
      consecutiveCorrect: 0, // до 5
      errorsCount: 0,        // всего ошибок
      correctCount: 0,       // всего верных
      isLearned: false       // флаг выученности (consecutiveCorrect >= 5)
    };

    words.push(newPair);
    saveWords(words);
    return true;
  };

  // Удалить слово
  const deleteWord = (id) => {
    let words = getWords();
    words = words.filter(w => w.id !== id);
    saveWords(words);
  };

  // Обновить конкретное слово
  const updateWord = (updatedWord) => {
    const words = getWords();
    const index = words.findIndex(w => w.id === updatedWord.id);
    if (index !== -1) {
      words[index] = updatedWord;
      saveWords(words);
    }
  };

  // Импорт массива слов из JSON
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

  //  метод проверки и автозагрузки:
  const initDefaultWords = async () => {
    const currentWords = getWords();
    // Если в хранилище пусто, пробуем подгрузить dictHTML.json
    if (currentWords.length === 0) {
      try {
        const response = await fetch('./dictHTML.json');
        if (response.ok) {
          const data = await response.json();
          importJSON(JSON.stringify(data));
          console.log('Дефолтные слова успешно загружены из dictHTML.json');
        }
      } catch (e) {
        console.error('Не удалось загрузить dictHTML.json автоматически:', e);
      }
    }
  };
  return { getWords, saveWords, addWord, deleteWord, updateWord, importJSON, initDefaultWords };
})();