/**
 * Управление сеансом заучивания (20 слов, интервальность, варианты)
 */
const SessionModule = (() => {
  let currentDeck = [];
  let currentIndex = 0;
  let sessionCorrect = 0;
  let sessionErrors = 0;

  // Сформировать колоду на сеанс (до 20 слов)
  const initSession = () => {
    const allWords = StorageModule.getWords();
    if (allWords.length < 4) return false;

    // Определяем трудные слова (errorsCount >= 2)
    const hardWords = allWords.filter(w => w.errorsCount >= 2);
    const normalWords = allWords.filter(w => w.errorsCount < 2);

    // Перемешивание (Fisher-Yates)
    const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

    // Приоритет отдается сложным словам
    let selected = [...shuffle(hardWords), ...shuffle(normalWords)];

    // Если слов меньше 20, они зацикливаются, иначе берутся первые 20
    if (selected.length < 20) {
      let looped = [];
      while (looped.length < 20) {
        looped = looped.concat(shuffle(selected));
      }
      currentDeck = looped.slice(0, 20);
    } else {
      currentDeck = selected.slice(0, 20);
    }

    currentIndex = 0;
    sessionCorrect = 0;
    sessionErrors = 0;
    return true;
  };

  const getCurrentWord = () => currentDeck[currentIndex];
  const getProgress = () => ({ current: currentIndex + 1, total: currentDeck.length });
  const getSessionStats = () => ({ correct: sessionCorrect, errors: sessionErrors });

  // Сгенерировать 4 варианта ответа (1 правильный, 3 неверных)
  const generateOptions = () => {
    const current = getCurrentWord();
    const allWords = StorageModule.getWords();

    // Доступные дистракторы (не совпадающие с правильным)
    const otherTranslations = allWords
      .filter(w => w.translation !== current.translation)
      .map(w => w.translation);

    // Случайные 3 дистрактора
    const shuffledDistractors = otherTranslations.sort(() => Math.random() - 0.5).slice(0, 3);

    const options = [current.translation, ...shuffledDistractors];
    return options.sort(() => Math.random() - 0.5); // Перемешиваем кнопки
  };

  // Обработка ответа
  const handleAnswer = (selectedOption) => {
    const current = getCurrentWord();
    const isCorrect = selectedOption === current.translation;

    // Находим актуальный объект слова из хранилища для обновления
    const allWords = StorageModule.getWords();
    const wordObj = allWords.find(w => w.id === current.id) || current;

    if (isCorrect) {
      sessionCorrect++;
      wordObj.correctCount++;
      wordObj.consecutiveCorrect++;

      if (wordObj.consecutiveCorrect >= 5) {
        wordObj.isLearned = true;
      }
    } else {
      sessionErrors++;
      wordObj.errorsCount++;
      wordObj.consecutiveCorrect = 0; // Сброс счетчика подряд
      wordObj.isLearned = false;
    }

    StorageModule.updateWord(wordObj);
    return isCorrect;
  };

  const nextWord = () => {
    currentIndex++;
    return currentIndex < currentDeck.length;
  };

  return { initSession, getCurrentWord, getProgress, getSessionStats, generateOptions, handleAnswer, nextWord };
})();