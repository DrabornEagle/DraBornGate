(() => {
  'use strict';

  const DKD_STORAGE_KEY = 'dkd_gate_whatsapp_contacts_v1';
  const DKD_MESSAGE_KEY = 'dkd_gate_whatsapp_message_v1';
  const DKD_PLAY_KEY = 'dkd_gate_whatsapp_play_url_v1';
  const DKD_DEFAULT_MESSAGE = `Merhaba {ad},\n\nSite sakinlerimize özel geliştirilen DraBornGate uygulaması kullanıma açılmıştır.\n\nDraBornGate ile site duyurularını takip edebilir, yönetimle iletişim kurabilir ve site içerisindeki hizmetlerden faydalanabilirsiniz.\n\nGoogle Play: {google_play}`;

  const dkdState = {
    contacts: [],
    queueIds: [],
    queueIndex: 0,
  };

  const dkdElements = {};

  function dkdCreateId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `dkd_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function dkdSafeText(value) {
    return String(value ?? '').trim();
  }

  function dkdNormalizeForSearch(value) {
    return dkdSafeText(value)
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  function dkdDecodeQuotedPrintable(value) {
    const dkdJoined = String(value ?? '').replace(/=\r?\n/g, '');
    try {
      const dkdBytes = [];
      for (let dkdIndex = 0; dkdIndex < dkdJoined.length; dkdIndex += 1) {
        if (dkdJoined[dkdIndex] === '=' && /^[0-9A-Fa-f]{2}$/.test(dkdJoined.slice(dkdIndex + 1, dkdIndex + 3))) {
          dkdBytes.push(Number.parseInt(dkdJoined.slice(dkdIndex + 1, dkdIndex + 3), 16));
          dkdIndex += 2;
        } else {
          dkdBytes.push(dkdJoined.charCodeAt(dkdIndex));
        }
      }
      return new TextDecoder('utf-8').decode(new Uint8Array(dkdBytes));
    } catch {
      return dkdJoined.replace(/=([0-9A-Fa-f]{2})/g, (_, dkdHex) => String.fromCharCode(Number.parseInt(dkdHex, 16)));
    }
  }

  function dkdDecodeVCardValue(dkdRawLine) {
    const dkdSeparatorIndex = dkdRawLine.indexOf(':');
    if (dkdSeparatorIndex < 0) return '';
    const dkdMeta = dkdRawLine.slice(0, dkdSeparatorIndex).toUpperCase();
    let dkdValue = dkdRawLine.slice(dkdSeparatorIndex + 1);

    if (dkdMeta.includes('ENCODING=QUOTED-PRINTABLE')) dkdValue = dkdDecodeQuotedPrintable(dkdValue);
    if (dkdMeta.includes('ENCODING=B') || dkdMeta.includes('ENCODING=BASE64')) {
      try {
        const dkdBinary = atob(dkdValue.replace(/\s/g, ''));
        const dkdBytes = Uint8Array.from(dkdBinary, (dkdCharacter) => dkdCharacter.charCodeAt(0));
        dkdValue = new TextDecoder('utf-8').decode(dkdBytes);
      } catch {
        // Geçersiz Base64 değeri ham haliyle bırakılır.
      }
    }

    return dkdValue
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  function dkdUnfoldVCardLines(dkdText) {
    return String(dkdText ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .reduce((dkdLines, dkdLine) => {
        if (!dkdLines.length) {
          dkdLines.push(dkdLine);
        } else if (dkdLine.startsWith(' ') || dkdLine.startsWith('\t')) {
          dkdLines[dkdLines.length - 1] += dkdLine.slice(1);
        } else if (dkdLines[dkdLines.length - 1].endsWith('=')) {
          dkdLines[dkdLines.length - 1] += `\n${dkdLine}`;
        } else {
          dkdLines.push(dkdLine);
        }
        return dkdLines;
      }, []);
  }

  function dkdNormalizePhone(dkdPhone) {
    const dkdRaw = dkdSafeText(dkdPhone).replace(/[^\d+]/g, '');
    let dkdDigits = dkdRaw.replace(/\D/g, '');
    if (!dkdDigits) return '';

    if (dkdDigits.startsWith('0090')) dkdDigits = dkdDigits.slice(2);
    if (dkdDigits.startsWith('90') && dkdDigits.length === 12) return `+${dkdDigits}`;
    if (dkdDigits.startsWith('0') && dkdDigits.length === 11) return `+90${dkdDigits.slice(1)}`;
    if (dkdDigits.length === 10 && dkdDigits.startsWith('5')) return `+90${dkdDigits}`;
    if (dkdRaw.startsWith('+') && dkdDigits.length >= 10 && dkdDigits.length <= 15) return `+${dkdDigits}`;
    if (dkdDigits.length >= 10 && dkdDigits.length <= 15) return `+${dkdDigits}`;
    return '';
  }

  function dkdExtractBlockAndFlat(dkdText) {
    const dkdSource = dkdSafeText(dkdText);
    const dkdBlockAfterLabel = dkdSource.match(/(?:blok|block)\s*[:\-]?\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9]+)/i);
    const dkdBlockBeforeLabel = dkdSource.match(/([A-Za-zÇĞİÖŞÜçğıöşü0-9]+)\s*(?:blok|block)\b/i);
    const dkdFlatMatch = dkdSource.match(/(?:daire|flat|apt|apartment)\s*[:\-]?\s*([A-Za-z0-9\/-]+)/i);
    const dkdBlockValue = dkdBlockBeforeLabel?.[1] || dkdBlockAfterLabel?.[1] || '';
    return {
      block: dkdBlockValue ? `${dkdBlockValue} Blok` : '',
      flat: dkdFlatMatch ? dkdFlatMatch[1] : '',
    };
  }

  function dkdParseVcf(dkdText) {
    const dkdLines = dkdUnfoldVCardLines(dkdText);
    const dkdCards = [];
    let dkdCurrent = null;

    dkdLines.forEach((dkdLine) => {
      const dkdUpperLine = dkdLine.toUpperCase();
      if (dkdUpperLine === 'BEGIN:VCARD') {
        dkdCurrent = { name: '', phones: [], notes: [], addresses: [] };
        return;
      }
      if (dkdUpperLine === 'END:VCARD') {
        if (dkdCurrent) dkdCards.push(dkdCurrent);
        dkdCurrent = null;
        return;
      }
      if (!dkdCurrent) return;

      const dkdProperty = dkdLine.split(':', 1)[0].split(';', 1)[0].toUpperCase().split('.').pop();
      const dkdValue = dkdDecodeVCardValue(dkdLine);
      if (dkdProperty === 'FN' && dkdValue) dkdCurrent.name = dkdValue;
      if (dkdProperty === 'N' && !dkdCurrent.name && dkdValue) {
        const [dkdSurname = '', dkdFirstName = '', dkdMiddleName = ''] = dkdValue.split(';');
        dkdCurrent.name = [dkdFirstName, dkdMiddleName, dkdSurname].filter(Boolean).join(' ').trim();
      }
      if (dkdProperty === 'TEL' && dkdValue) dkdCurrent.phones.push(dkdValue);
      if (dkdProperty === 'NOTE' && dkdValue) dkdCurrent.notes.push(dkdValue);
      if (dkdProperty === 'ADR' && dkdValue) dkdCurrent.addresses.push(dkdValue.split(';').filter(Boolean).join(' '));
    });

    const dkdByPhone = new Map();
    dkdCards.forEach((dkdCard) => {
      const dkdContext = [...dkdCard.notes, ...dkdCard.addresses].join(' ');
      const dkdLocation = dkdExtractBlockAndFlat(dkdContext);
      dkdCard.phones.forEach((dkdPhone) => {
        const dkdNormalized = dkdNormalizePhone(dkdPhone);
        if (!dkdNormalized) return;
        const dkdExisting = dkdByPhone.get(dkdNormalized);
        if (dkdExisting) {
          if (!dkdExisting.name && dkdCard.name) dkdExisting.name = dkdCard.name;
          if (!dkdExisting.block && dkdLocation.block) dkdExisting.block = dkdLocation.block;
          if (!dkdExisting.flat && dkdLocation.flat) dkdExisting.flat = dkdLocation.flat;
          return;
        }
        dkdByPhone.set(dkdNormalized, {
          id: dkdCreateId(),
          name: dkdCard.name || 'İsimsiz Kişi',
          phone: dkdNormalized,
          block: dkdLocation.block,
          flat: dkdLocation.flat,
          selected: true,
          sent: false,
          createdAt: new Date().toISOString(),
        });
      });
    });

    return Array.from(dkdByPhone.values());
  }

  function dkdLoadState() {
    try {
      const dkdStored = JSON.parse(localStorage.getItem(DKD_STORAGE_KEY) || '[]');
      dkdState.contacts = Array.isArray(dkdStored)
        ? dkdStored.map((dkdContact) => ({
            id: dkdSafeText(dkdContact.id) || dkdCreateId(),
            name: dkdSafeText(dkdContact.name) || 'İsimsiz Kişi',
            phone: dkdNormalizePhone(dkdContact.phone),
            block: dkdSafeText(dkdContact.block),
            flat: dkdSafeText(dkdContact.flat),
            selected: dkdContact.selected !== false,
            sent: dkdContact.sent === true,
            createdAt: dkdContact.createdAt || new Date().toISOString(),
          })).filter((dkdContact) => dkdContact.phone)
        : [];
    } catch {
      dkdState.contacts = [];
    }

    dkdElements.bulkMessage.value = localStorage.getItem(DKD_MESSAGE_KEY) || DKD_DEFAULT_MESSAGE;
    dkdElements.playStoreUrl.value = localStorage.getItem(DKD_PLAY_KEY) || '';
  }

  function dkdSaveContacts() {
    localStorage.setItem(DKD_STORAGE_KEY, JSON.stringify(dkdState.contacts));
  }

  function dkdSaveMessage() {
    localStorage.setItem(DKD_MESSAGE_KEY, dkdElements.bulkMessage.value.trim() || DKD_DEFAULT_MESSAGE);
    localStorage.setItem(DKD_PLAY_KEY, dkdElements.playStoreUrl.value.trim());
  }

  function dkdShowToast(dkdMessage) {
    dkdElements.toast.textContent = dkdMessage;
    dkdElements.toast.classList.add('is-visible');
    clearTimeout(dkdShowToast.timer);
    dkdShowToast.timer = setTimeout(() => dkdElements.toast.classList.remove('is-visible'), 2400);
  }

  function dkdBuildMessage(dkdContact, dkdTemplate = dkdElements.bulkMessage.value) {
    const dkdFirstName = dkdSafeText(dkdContact.name).split(/\s+/)[0] || 'Site Sakini';
    return String(dkdTemplate || DKD_DEFAULT_MESSAGE)
      .replaceAll('{ad}', dkdFirstName)
      .replaceAll('{ad_soyad}', dkdContact.name || 'Site Sakini')
      .replaceAll('{google_play}', dkdElements.playStoreUrl.value.trim());
  }

  function dkdWhatsAppUrl(dkdContact, dkdMessage) {
    const dkdDigits = dkdContact.phone.replace(/\D/g, '');
    return `https://wa.me/${dkdDigits}?text=${encodeURIComponent(dkdMessage)}`;
  }

  function dkdOpenWhatsApp(dkdContact, dkdMessage) {
    const dkdUrl = dkdWhatsAppUrl(dkdContact, dkdMessage);
    const dkdOpened = window.open(dkdUrl, '_blank');
    if (dkdOpened) dkdOpened.opener = null;
    else window.location.assign(dkdUrl);
  }

  function dkdContactMatches(dkdContact, dkdQuery) {
    if (!dkdQuery) return true;
    const dkdHaystack = dkdNormalizeForSearch([
      dkdContact.name,
      dkdContact.phone,
      dkdContact.phone.replace(/\D/g, ''),
      dkdContact.block,
      dkdContact.flat,
    ].join(' '));
    return dkdHaystack.includes(dkdQuery);
  }

  function dkdGetCollectorVisibleContacts() {
    const dkdQuery = dkdNormalizeForSearch(dkdElements.collectorSearch.value);
    return dkdState.contacts.filter((dkdContact) => dkdContactMatches(dkdContact, dkdQuery));
  }

  function dkdGetResidentVisibleContacts() {
    const dkdQuery = dkdNormalizeForSearch(dkdElements.residentSearch.value);
    const dkdBlock = dkdElements.blockFilter.value;
    return dkdState.contacts.filter((dkdContact) => {
      const dkdMatchesBlock = !dkdBlock || dkdContact.block === dkdBlock;
      return dkdMatchesBlock && dkdContactMatches(dkdContact, dkdQuery);
    });
  }

  function dkdUpdateStats() {
    const dkdSelected = dkdState.contacts.filter((dkdContact) => dkdContact.selected && !dkdContact.sent);
    const dkdSent = dkdState.contacts.filter((dkdContact) => dkdContact.sent);
    dkdElements.totalCount.textContent = String(dkdState.contacts.length);
    dkdElements.selectedCount.textContent = String(dkdSelected.length);
    dkdElements.sentCount.textContent = String(dkdSent.length);
    dkdElements.queueSummary.textContent = dkdSelected.length ? `${dkdSelected.length} kişi gönderime hazır` : 'Gönderime hazır kişi yok';
    dkdElements.startQueueButton.disabled = dkdSelected.length === 0;
  }

  function dkdRenderCollector() {
    const dkdContacts = dkdGetCollectorVisibleContacts();
    dkdElements.collectorEmpty.hidden = dkdContacts.length > 0;
    dkdElements.collectorList.replaceChildren();

    dkdContacts.forEach((dkdContact) => {
      const dkdRow = document.createElement('div');
      dkdRow.className = 'dkd-contact-row';
      const dkdCheckbox = document.createElement('input');
      dkdCheckbox.className = 'dkd-check';
      dkdCheckbox.type = 'checkbox';
      dkdCheckbox.checked = dkdContact.selected;
      dkdCheckbox.disabled = dkdContact.sent;
      dkdCheckbox.setAttribute('aria-label', `${dkdContact.name} kişisini seç`);
      dkdCheckbox.addEventListener('change', () => {
        dkdContact.selected = dkdCheckbox.checked;
        dkdSaveContacts();
        dkdUpdateStats();
      });

      const dkdMain = document.createElement('div');
      dkdMain.className = 'dkd-contact-main';
      const dkdName = document.createElement('strong');
      dkdName.textContent = dkdContact.name;
      const dkdPhone = document.createElement('span');
      dkdPhone.textContent = dkdContact.phone;
      dkdMain.append(dkdName, dkdPhone);

      const dkdStatus = document.createElement('span');
      dkdStatus.className = `dkd-status-pill${dkdContact.sent ? ' is-sent' : ''}`;
      dkdStatus.textContent = dkdContact.sent ? 'Gönderildi' : 'Hazır';
      dkdRow.append(dkdCheckbox, dkdMain, dkdStatus);
      dkdElements.collectorList.append(dkdRow);
    });

    dkdUpdateStats();
  }

  function dkdRefreshBlockFilter() {
    const dkdCurrent = dkdElements.blockFilter.value;
    const dkdBlocks = Array.from(new Set(dkdState.contacts.map((dkdContact) => dkdContact.block).filter(Boolean)))
      .sort((dkdFirst, dkdSecond) => dkdFirst.localeCompare(dkdSecond, 'tr'));
    dkdElements.blockFilter.replaceChildren(new Option('Tüm Bloklar', ''));
    dkdBlocks.forEach((dkdBlock) => dkdElements.blockFilter.add(new Option(dkdBlock, dkdBlock)));
    if (dkdBlocks.includes(dkdCurrent)) dkdElements.blockFilter.value = dkdCurrent;
  }

  function dkdRenderResidents() {
    dkdRefreshBlockFilter();
    const dkdContacts = dkdGetResidentVisibleContacts();
    dkdElements.residentEmpty.hidden = dkdContacts.length > 0;
    dkdElements.residentList.replaceChildren();

    dkdContacts.forEach((dkdContact) => {
      const dkdRow = document.createElement('div');
      dkdRow.className = 'dkd-resident-row';

      const dkdMain = document.createElement('div');
      dkdMain.className = 'dkd-resident-main';
      const dkdName = document.createElement('strong');
      dkdName.textContent = dkdContact.name;
      const dkdPhone = document.createElement('span');
      dkdPhone.textContent = dkdContact.phone;
      dkdMain.append(dkdName, dkdPhone);

      const dkdBlock = document.createElement('div');
      dkdBlock.className = 'dkd-resident-meta';
      dkdBlock.innerHTML = '<span>Blok</span>';
      const dkdBlockValue = document.createElement('strong');
      dkdBlockValue.textContent = dkdContact.block || '—';
      dkdBlock.append(dkdBlockValue);

      const dkdFlat = document.createElement('div');
      dkdFlat.className = 'dkd-resident-meta';
      dkdFlat.innerHTML = '<span>Daire</span>';
      const dkdFlatValue = document.createElement('strong');
      dkdFlatValue.textContent = dkdContact.flat || '—';
      dkdFlat.append(dkdFlatValue);

      const dkdStatus = document.createElement('div');
      dkdStatus.className = 'dkd-resident-meta';
      dkdStatus.innerHTML = '<span>Mesaj Durumu</span>';
      const dkdStatusValue = document.createElement('strong');
      dkdStatusValue.textContent = dkdContact.sent ? 'Daha önce gönderildi' : 'Gönderime hazır';
      dkdStatus.append(dkdStatusValue);

      const dkdActions = document.createElement('div');
      dkdActions.className = 'dkd-row-actions';
      const dkdMessageButton = document.createElement('button');
      dkdMessageButton.className = 'dkd-button dkd-button-primary';
      dkdMessageButton.type = 'button';
      dkdMessageButton.textContent = 'WhatsApp';
      dkdMessageButton.addEventListener('click', () => dkdOpenMessageDialog(dkdContact.id));
      const dkdEditButton = document.createElement('button');
      dkdEditButton.className = 'dkd-button dkd-button-muted';
      dkdEditButton.type = 'button';
      dkdEditButton.textContent = 'Düzenle';
      dkdEditButton.addEventListener('click', () => dkdOpenResidentDialog(dkdContact.id));
      const dkdDeleteButton = document.createElement('button');
      dkdDeleteButton.className = 'dkd-button dkd-button-danger';
      dkdDeleteButton.type = 'button';
      dkdDeleteButton.textContent = 'Sil';
      dkdDeleteButton.addEventListener('click', () => dkdDeleteResident(dkdContact.id));
      dkdActions.append(dkdMessageButton, dkdEditButton, dkdDeleteButton);

      dkdRow.append(dkdMain, dkdBlock, dkdFlat, dkdStatus, dkdActions);
      dkdElements.residentList.append(dkdRow);
    });
  }

  function dkdRenderAll() {
    dkdRenderCollector();
    dkdRenderResidents();
  }

  function dkdMergeContacts(dkdIncoming) {
    const dkdByPhone = new Map(dkdState.contacts.map((dkdContact) => [dkdContact.phone, dkdContact]));
    let dkdAdded = 0;
    let dkdUpdated = 0;
    dkdIncoming.forEach((dkdContact) => {
      const dkdExisting = dkdByPhone.get(dkdContact.phone);
      if (!dkdExisting) {
        dkdState.contacts.push(dkdContact);
        dkdByPhone.set(dkdContact.phone, dkdContact);
        dkdAdded += 1;
        return;
      }
      if ((!dkdExisting.name || dkdExisting.name === 'İsimsiz Kişi') && dkdContact.name) dkdExisting.name = dkdContact.name;
      if (!dkdExisting.block && dkdContact.block) dkdExisting.block = dkdContact.block;
      if (!dkdExisting.flat && dkdContact.flat) dkdExisting.flat = dkdContact.flat;
      dkdUpdated += 1;
    });
    dkdSaveContacts();
    dkdRenderAll();
    return { added: dkdAdded, updated: dkdUpdated };
  }

  async function dkdHandleVcfFile(dkdFile) {
    if (!dkdFile) return;
    try {
      const dkdText = await dkdFile.text();
      const dkdParsed = dkdParseVcf(dkdText);
      if (!dkdParsed.length) throw new Error('VCF içinde geçerli telefon numarası bulunamadı.');
      const dkdResult = dkdMergeContacts(dkdParsed);
      dkdElements.importStatus.className = 'dkd-status is-success';
      dkdElements.importStatus.textContent = `${dkdParsed.length} geçerli numara okundu. ${dkdResult.added} yeni kişi eklendi, ${dkdResult.updated} mevcut kayıt eşleştirildi.`;
      dkdShowToast('VCF rehberi başarıyla içe aktarıldı.');
    } catch (dkdError) {
      dkdElements.importStatus.className = 'dkd-status is-error';
      dkdElements.importStatus.textContent = dkdError instanceof Error ? dkdError.message : 'VCF dosyası okunamadı.';
    } finally {
      dkdElements.vcfFile.value = '';
    }
  }

  async function dkdHandleJsonFile(dkdFile) {
    if (!dkdFile) return;
    try {
      const dkdPayload = JSON.parse(await dkdFile.text());
      const dkdRows = Array.isArray(dkdPayload) ? dkdPayload : dkdPayload.contacts;
      if (!Array.isArray(dkdRows)) throw new Error('Yedek dosyası geçerli değil.');
      if (!Array.isArray(dkdPayload)) {
        if (typeof dkdPayload.message === 'string') dkdElements.bulkMessage.value = dkdPayload.message;
        if (typeof dkdPayload.playStoreUrl === 'string') dkdElements.playStoreUrl.value = dkdPayload.playStoreUrl;
        dkdSaveMessage();
      }
      const dkdIncoming = dkdRows.map((dkdContact) => ({
        id: dkdCreateId(),
        name: dkdSafeText(dkdContact.name) || 'İsimsiz Kişi',
        phone: dkdNormalizePhone(dkdContact.phone),
        block: dkdSafeText(dkdContact.block),
        flat: dkdSafeText(dkdContact.flat),
        selected: dkdContact.selected !== false,
        sent: dkdContact.sent === true,
        createdAt: dkdContact.createdAt || new Date().toISOString(),
      })).filter((dkdContact) => dkdContact.phone);
      const dkdResult = dkdMergeContacts(dkdIncoming);
      dkdShowToast(`${dkdResult.added} kayıt yedekten eklendi.`);
    } catch (dkdError) {
      dkdShowToast(dkdError instanceof Error ? dkdError.message : 'Yedek yüklenemedi.');
    } finally {
      dkdElements.jsonFile.value = '';
    }
  }

  function dkdDownloadBackup() {
    const dkdPayload = {
      exportedAt: new Date().toISOString(),
      contacts: dkdState.contacts,
      message: dkdElements.bulkMessage.value,
      playStoreUrl: dkdElements.playStoreUrl.value,
    };
    const dkdBlob = new Blob([JSON.stringify(dkdPayload, null, 2)], { type: 'application/json' });
    const dkdUrl = URL.createObjectURL(dkdBlob);
    const dkdAnchor = document.createElement('a');
    dkdAnchor.href = dkdUrl;
    dkdAnchor.download = `DraBornGate_WhatsApp_Rehber_${new Date().toISOString().slice(0, 10)}.json`;
    dkdAnchor.click();
    URL.revokeObjectURL(dkdUrl);
  }

  function dkdOpenResidentDialog(dkdId = '') {
    const dkdContact = dkdState.contacts.find((dkdItem) => dkdItem.id === dkdId);
    dkdElements.residentDialogTitle.textContent = dkdContact ? 'Sakin kaydını düzenle' : 'Yeni sakin ekle';
    dkdElements.residentId.value = dkdContact?.id || '';
    dkdElements.residentName.value = dkdContact?.name || '';
    dkdElements.residentPhone.value = dkdContact?.phone || '';
    dkdElements.residentBlock.value = dkdContact?.block || '';
    dkdElements.residentFlat.value = dkdContact?.flat || '';
    dkdElements.residentDialog.showModal();
    setTimeout(() => dkdElements.residentName.focus(), 0);
  }

  function dkdSaveResidentFromForm() {
    const dkdId = dkdElements.residentId.value;
    const dkdPhone = dkdNormalizePhone(dkdElements.residentPhone.value);
    if (!dkdPhone) {
      dkdShowToast('Geçerli bir telefon numarası gir.');
      return false;
    }
    const dkdDuplicate = dkdState.contacts.find((dkdContact) => dkdContact.phone === dkdPhone && dkdContact.id !== dkdId);
    if (dkdDuplicate) {
      dkdShowToast('Bu telefon numarası başka bir kayıtta bulunuyor.');
      return false;
    }

    const dkdPayload = {
      name: dkdSafeText(dkdElements.residentName.value) || 'İsimsiz Kişi',
      phone: dkdPhone,
      block: dkdSafeText(dkdElements.residentBlock.value),
      flat: dkdSafeText(dkdElements.residentFlat.value),
    };

    if (dkdId) {
      const dkdContact = dkdState.contacts.find((dkdItem) => dkdItem.id === dkdId);
      if (dkdContact) Object.assign(dkdContact, dkdPayload);
    } else {
      dkdState.contacts.push({ id: dkdCreateId(), ...dkdPayload, selected: true, sent: false, createdAt: new Date().toISOString() });
    }

    dkdSaveContacts();
    dkdRenderAll();
    dkdShowToast('Site sakini kaydedildi.');
    return true;
  }

  function dkdDeleteResident(dkdId) {
    const dkdContact = dkdState.contacts.find((dkdItem) => dkdItem.id === dkdId);
    if (!dkdContact) return;
    if (!window.confirm(`${dkdContact.name} kaydı silinsin mi?`)) return;
    dkdState.contacts = dkdState.contacts.filter((dkdItem) => dkdItem.id !== dkdId);
    dkdSaveContacts();
    dkdRenderAll();
    dkdShowToast('Kayıt silindi.');
  }

  function dkdOpenMessageDialog(dkdId) {
    const dkdContact = dkdState.contacts.find((dkdItem) => dkdItem.id === dkdId);
    if (!dkdContact) return;
    dkdElements.messageContactId.value = dkdContact.id;
    dkdElements.messageDialogTitle.textContent = `${dkdContact.name} kişisine mesaj`;
    dkdElements.singleMessage.value = dkdBuildMessage(dkdContact);
    dkdElements.messageDialog.showModal();
  }

  function dkdStartQueue() {
    if (!dkdElements.playStoreUrl.value.trim()) {
      dkdShowToast('Önce Google Play bağlantısını gir.');
      dkdElements.playStoreUrl.focus();
      return;
    }
    dkdSaveMessage();
    dkdState.queueIds = dkdState.contacts.filter((dkdContact) => dkdContact.selected && !dkdContact.sent).map((dkdContact) => dkdContact.id);
    dkdState.queueIndex = 0;
    if (!dkdState.queueIds.length) return;
    dkdShowCurrentQueueContact();
    dkdElements.queueDialog.showModal();
  }

  function dkdCurrentQueueContact() {
    const dkdId = dkdState.queueIds[dkdState.queueIndex];
    return dkdState.contacts.find((dkdContact) => dkdContact.id === dkdId) || null;
  }

  function dkdShowCurrentQueueContact() {
    const dkdContact = dkdCurrentQueueContact();
    if (!dkdContact) {
      dkdElements.queueDialog.close();
      dkdShowToast('Seçilen kişiler tamamlandı.');
      dkdRenderAll();
      return;
    }
    dkdElements.queueContactName.textContent = dkdContact.name;
    dkdElements.queueContactPhone.textContent = dkdContact.phone;
    dkdElements.queueProgress.textContent = `${dkdState.queueIndex + 1} / ${dkdState.queueIds.length}`;
  }

  function dkdAdvanceQueue(dkdMarkSent) {
    const dkdContact = dkdCurrentQueueContact();
    if (dkdContact && dkdMarkSent) {
      dkdContact.sent = true;
      dkdContact.selected = false;
      dkdSaveContacts();
    }
    dkdState.queueIndex += 1;
    dkdShowCurrentQueueContact();
  }

  function dkdBindElements() {
    [
      'vcfFile', 'jsonFile', 'clearContactsButton', 'exportContactsButton', 'importStatus',
      'playStoreUrl', 'bulkMessage', 'saveMessageButton', 'totalCount', 'selectedCount',
      'sentCount', 'collectorSearch', 'selectAllButton', 'deselectAllButton', 'resetSentButton',
      'collectorEmpty', 'collectorList', 'queueSummary', 'startQueueButton', 'residentSearch',
      'blockFilter', 'addResidentButton', 'residentEmpty', 'residentList', 'residentDialog',
      'residentForm', 'residentDialogTitle', 'residentId', 'residentName', 'residentPhone',
      'residentBlock', 'residentFlat', 'closeResidentDialog', 'cancelResidentButton', 'messageDialog',
      'messageForm', 'messageDialogTitle', 'messageContactId', 'singleMessage', 'closeMessageDialog',
      'cancelMessageButton', 'queueDialog', 'queueContactName', 'queueContactPhone', 'queueProgress',
      'closeQueueDialog', 'openQueueWhatsAppButton', 'markSentNextButton', 'skipQueueButton', 'toast',
    ].forEach((dkdId) => { dkdElements[dkdId] = document.getElementById(dkdId); });
  }

  function dkdBindEvents() {
    document.querySelectorAll('.dkd-tab').forEach((dkdTab) => {
      dkdTab.addEventListener('click', () => {
        const dkdTarget = dkdTab.dataset.tab;
        document.querySelectorAll('.dkd-tab').forEach((dkdItem) => dkdItem.classList.toggle('is-active', dkdItem === dkdTab));
        document.querySelectorAll('.dkd-panel').forEach((dkdPanel) => dkdPanel.classList.toggle('is-active', dkdPanel.dataset.panel === dkdTarget));
      });
    });

    dkdElements.vcfFile.addEventListener('change', () => void dkdHandleVcfFile(dkdElements.vcfFile.files?.[0]));
    dkdElements.jsonFile.addEventListener('change', () => void dkdHandleJsonFile(dkdElements.jsonFile.files?.[0]));
    dkdElements.exportContactsButton.addEventListener('click', dkdDownloadBackup);
    dkdElements.clearContactsButton.addEventListener('click', () => {
      if (!dkdState.contacts.length || !window.confirm('Bu cihazdaki tüm rehber kayıtları silinsin mi?')) return;
      dkdState.contacts = [];
      dkdSaveContacts();
      dkdRenderAll();
      dkdShowToast('Rehber temizlendi.');
    });
    dkdElements.saveMessageButton.addEventListener('click', () => { dkdSaveMessage(); dkdShowToast('Mesaj kaydedildi.'); });
    dkdElements.collectorSearch.addEventListener('input', dkdRenderCollector);
    dkdElements.residentSearch.addEventListener('input', dkdRenderResidents);
    dkdElements.blockFilter.addEventListener('change', dkdRenderResidents);

    dkdElements.selectAllButton.addEventListener('click', () => {
      dkdGetCollectorVisibleContacts().forEach((dkdContact) => { if (!dkdContact.sent) dkdContact.selected = true; });
      dkdSaveContacts();
      dkdRenderCollector();
    });
    dkdElements.deselectAllButton.addEventListener('click', () => {
      dkdGetCollectorVisibleContacts().forEach((dkdContact) => { dkdContact.selected = false; });
      dkdSaveContacts();
      dkdRenderCollector();
    });
    dkdElements.resetSentButton.addEventListener('click', () => {
      dkdState.contacts.forEach((dkdContact) => { dkdContact.sent = false; });
      dkdSaveContacts();
      dkdRenderAll();
      dkdShowToast('Gönderim durumları sıfırlandı.');
    });

    dkdElements.addResidentButton.addEventListener('click', () => dkdOpenResidentDialog());
    dkdElements.closeResidentDialog.addEventListener('click', () => dkdElements.residentDialog.close());
    dkdElements.cancelResidentButton.addEventListener('click', () => dkdElements.residentDialog.close());
    dkdElements.residentForm.addEventListener('submit', (dkdEvent) => {
      dkdEvent.preventDefault();
      if (dkdSaveResidentFromForm()) dkdElements.residentDialog.close();
    });

    dkdElements.closeMessageDialog.addEventListener('click', () => dkdElements.messageDialog.close());
    dkdElements.cancelMessageButton.addEventListener('click', () => dkdElements.messageDialog.close());
    dkdElements.messageForm.addEventListener('submit', (dkdEvent) => {
      dkdEvent.preventDefault();
      const dkdContact = dkdState.contacts.find((dkdItem) => dkdItem.id === dkdElements.messageContactId.value);
      if (!dkdContact) return;
      dkdOpenWhatsApp(dkdContact, dkdElements.singleMessage.value.trim());
      dkdElements.messageDialog.close();
    });

    dkdElements.startQueueButton.addEventListener('click', dkdStartQueue);
    dkdElements.closeQueueDialog.addEventListener('click', () => dkdElements.queueDialog.close());
    dkdElements.openQueueWhatsAppButton.addEventListener('click', () => {
      const dkdContact = dkdCurrentQueueContact();
      if (dkdContact) dkdOpenWhatsApp(dkdContact, dkdBuildMessage(dkdContact));
    });
    dkdElements.markSentNextButton.addEventListener('click', () => dkdAdvanceQueue(true));
    dkdElements.skipQueueButton.addEventListener('click', () => dkdAdvanceQueue(false));
  }

  function dkdInit() {
    dkdBindElements();
    dkdLoadState();
    dkdBindEvents();
    dkdRenderAll();
  }

  globalThis.DkdWhatsAppUtils = {
    normalizePhone: dkdNormalizePhone,
    parseVcf: dkdParseVcf,
    buildSearchValue: dkdNormalizeForSearch,
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dkdInit, { once: true });
    else dkdInit();
  }
})();
