/**
 * @typedef {Object} PathInfo
 * @property {string} href
 * @property {string} fullName
 * @property {string} fileName
 * @property {Array<string>} folders
 */

/**
 * @typedef {Object} Directory
 * @property {string} fullName
 * @property {Array<File>} files
 * @property {Record<string, Directory>} subDirs
 */

/**
 * @typedef {Object} File
 * @property {string} fullName
 * @property {string} fileName
 * @property {string} href
 */

(function () {
  const defaultInclusions = localStorage.getItem('defaultInclusions');
  const defaultExclusions = localStorage.getItem('defaultExclusions');
  // Only attach once
  if (!document.querySelector('#gdf-tree')) {

    // Includes processed by grunt-include-replace.
    var cssTemplate = '<style>@@include("style.min.css")</style>';
    var viewedTemplate = '@@include("../temp/html/viewed.html")';
    var fileTreeTemplate = '@@include("../temp/html/fileTree.html")';
    var dirNodeTemplate = '@@include("../temp/html/directoryNode.html")';
    var fileNodeTemplate = '@@include("../temp/html/fileNode.html")';
    var addedVisual = '@@include("../temp/html/visualAdded.html")';
    var deletedVisual = '@@include("../temp/html/visualDeleted.html")';
    var modifiedVisual = '@@include("../temp/html/visualModified.html")';
    var renamedVisual = '@@include("../temp/html/visualRenamed.html")';

    /** @type {Set<HTMLElement>} */
    const hiddenElements = new Set();
    const excludedElements = new Set();
    const notIncludedElements = new Set();
    let updatingTree = false;


    const additionsRegex = /\d+(?= additions?)/
    const deletionsRegex = /\d+(?= deletions?)/

    appendStyles();
    appendViewedCheckboxes();
    appendFileTree();

    /**
     * 
     */
    function appendStyles() {
      document.head.append(
        document.createRange().createContextualFragment(cssTemplate)
      );
    }

    function applyInclusions({ target: txtIncludedFiles }) {
      const filter = getTextFilter(txtIncludedFiles.value);
      const oldFilter = txtIncludedFiles.oldValue;
      txtIncludedFiles.oldValue = filter;
      if (filter) {
        filterPath('*', notIncludedElements, true);
        unfilterPath(filter, notIncludedElements, true);
      } else if (oldFilter) {
        unfilterPath('*', notIncludedElements, true);
      }
    }

    function applyExclusions({ target: txtExcludedFiles }) {
      const filter = getTextFilter(txtExcludedFiles.value);
      const oldFilter = txtExcludedFiles.oldValue;
      txtExcludedFiles.oldValue = filter;
      if (oldFilter) {
        unfilterPath(oldFilter, excludedElements, true);
      }
      if (filter) {
        filterPath(filter, excludedElements, true);
      }
    }

    function getTextFilter(text) {
      return (text
        ? text.split(',').map(part => `${part}(/*)?`).join(',')
        : '');
    }

    /**
     * 
     */
    function appendViewedCheckboxes() {
      document.querySelectorAll('.js-file-header-dropdown').forEach(el => {
        el.before(
          document.createRange().createContextualFragment(viewedTemplate)
        );
      });
      document.querySelectorAll('.js-diff-progressive-container')
        .forEach(container => container.addEventListener('change', (event) => {
          if (event.target.classList.contains('js-reviewed-checkbox')) {
            const container = event.target.closest("[data-details-container-group]")
            const isOpen = container.classList.contains("open");
            if (isOpen === event.target.checked) {
              container.querySelector('.file-header .file-info button')?.click();
            }
          }
        }));
    }

    /**
     *
     */
    function appendFileTree() {
      const filesContainer = document.querySelector('#files');
      filesContainer.prepend(
        document.createRange().createContextualFragment(fileTreeTemplate)
      );
      filesContainer.classList.add(
        'Layout',
        'Layout--flowRow-until-lg',
        'Layout--gutter-condensed',
        'hx_Layout',
        'wants-full-width-container',
        'Layout--sidebarPosition-start',
        'Layout--sidebarPosition-flowRow-none'
      );
      filesContainer.querySelector('ul').append(
        ...buildFileTreeView()
      )
      filesContainer.querySelector('file-tree').addEventListener("change", toggleTreeNode);
      // Move all children from first js-diff-progressive-container to second to resolve styling issues
      const diffContainers = document.querySelectorAll('.js-diff-progressive-container');
      if (diffContainers.length > 1) {
        diffContainers[1].replaceChildren(...diffContainers[0].childNodes, ...diffContainers[1].childNodes);
      } else {
        diffContainers[0].before(document.createRange().createContextualFragment(
          '<div class="js-diff-progressive-container"></div>'
        ))
      }
      sortDiffContainers();

      const includedFiles = document.querySelector('#included-files')
      includedFiles.addEventListener('input', debounce(applyInclusions, 200));
      includedFiles.value = defaultInclusions;
      if (defaultInclusions) applyInclusions({target: includedFiles});
      document.querySelector('#save-inclusions')
        .addEventListener('click', () => localStorage.setItem('defaultInclusions', includedFiles.value));

      const excludedFiles = document.querySelector('#excluded-files')
      excludedFiles.addEventListener('input', debounce(applyExclusions, 200));
      excludedFiles.value = defaultExclusions;
      if (defaultExclusions) applyExclusions({target: excludedFiles});
      document.querySelector('#save-exclusions')
        .addEventListener('click', () => localStorage.setItem('defaultExclusions', excludedFiles.value));
    }

    /**
     * 
     * @param {Event} event 
     */
    function toggleTreeNode(event) {
      if (!updatingTree && event.target.type === 'checkbox') {
        /** @type {HTMLInputElement} */
        const checkbox = event.target;
        toggleAssociatedPath(checkbox);
        toggleDescendents(checkbox);
        toggleAncestors(checkbox);
        updatingTree = false;
      }
    }

    /**
     * 
     * @param {HTMLInputElement} checkbox 
     */
    function toggleAssociatedPath(checkbox) {
      const path = checkbox.dataset.fullname;
      if (checkbox.checked) {
        unfilterPath(path, hiddenElements);
      } else {
        filterPath(path, hiddenElements);
        foldTree(checkbox);
      }
    }

    /**
     * 
     * @param {HTMLInputElement} checkbox 
     */
    function foldTree(checkbox) {
      const button = checkbox.parentNode.querySelector('button');
      if (button?.ariaExpanded === 'true') {
        button.click();
      }
    }

    /**
     * 
     * @param {HTMLInputElement} checkbox 
     */
    function toggleDescendents(checkbox) {
      const children = checkbox.parentNode
        .querySelector('ul')
        ?.querySelectorAll('input[type="checkbox"]')
        .forEach(it => it.checked = checkbox.checked);
    }

    /**
     * 
     * @param {HTMLInputElement} checkbox 
     */
    function toggleAncestors(checkbox) {
      const parentRow = checkbox.parentNode.parentNode.closest("#gdf-tree li");
      if (parentRow) {
        const descendentCheckboxes = [...parentRow.querySelector("ul").querySelectorAll("input")];
        const numChecked = descendentCheckboxes.filter(it => it.checked).length;
        const allSame = [0, descendentCheckboxes.length].includes(numChecked);
        const parentRowCheckbox = [...parentRow.childNodes].filter(it => it.nodeName === "INPUT")[0];
        if (allSame) {
          parentRowCheckbox.checked = checkbox.checked;
          parentRowCheckbox.indeterminate = false;
        } else {
          parentRowCheckbox.checked = false;
          parentRowCheckbox.indeterminate = true;
        }
        toggleAncestors(parentRowCheckbox);
      }
    }

    /**
     * 
     */
    function sortDiffContainers() {
      const diffContainers = [...document.querySelectorAll('[data-tagsearch-path]')];
      diffContainers.sort((a, b) => {
        const pathA = a.attributes['data-tagsearch-path'].value;
        const pathB = b.attributes['data-tagsearch-path'].value;
        const dirAndFileA = getDirAndFile(pathA);
        const dirAndFileB = getDirAndFile(pathB);
        return compareDirAndPaths(dirAndFileA, dirAndFileB);
      });
      document.querySelector('.js-diff-progressive-container:last-child')
        .replaceChildren(...diffContainers);
    }

    function getDirAndFile(path) {
      const [file, ...dirParts] = path.split("/").reverse();
      const dir = dirParts.reverse().join("/");
      return { dir: dir, file: file };
    }

    function compareDirAndPaths({ dir: dirA, file: fileA }, { dir: dirB, file: fileB }) {
      if (dirA === dirB) {
        return fileA.localeCompare(fileB);
      } else if (dirA.includes(dirB)) {
        return -1;
      } else if (dirB.includes(dirA)) {
        return 1;
      } else {
        return dirA.localeCompare(dirB);
      }
    }

    /**
     * 
     * @returns {Array<DocumentFragment>}
     */
    function buildFileTreeView() {
      const pathTree = getPathTree();
      return [
        ...buildDirectoryNodes(pathTree, 1),
        ...buildFileNodes(pathTree.files, 1)
      ];
    }

    /**
     * 
     * @param {Directory} pathTree
     * @param {number} level
     * @returns {Array<DocumentFragment>}
     */
    function buildDirectoryNodes(pathTree, level) {
      return Object.entries(pathTree.subDirs)
        .map(([dirName, dir]) => createDirectoryNode(dirName, dir, level));
    }

    /**
     * 
     * @param {Array<File>} files 
     * @param {number} level
     * @returns {Array<DocumentFragment>}
     */
    function buildFileNodes(files, level) {
      return files
        .map(({ fullName, fileName, href, type }) => {
          return document.createRange().createContextualFragment(
            fileNodeTemplate
              .replaceAll('{{fullName}}', fullName)
              .replaceAll('{{fileName}}', fileName)
              .replaceAll('{{href}}', href)
              .replaceAll('{{level}}', level)
              .replaceAll('{{visual}}', getVisualTemplate(type))
          );
        });
    }

    function getVisualTemplate(type) {
      switch (type) {
        case 'added':
          return addedVisual;
        case 'deleted':
          return deletedVisual;
        case 'renamed':
          return renamedVisual;
        default:
          return modifiedVisual;
      }
    }

    /**
     * 
     * @param {string} dirName 
     * @param {Directory} dir 
     * @param {number} level 
     * @returns {DocumentFragment}
     */
    function createDirectoryNode(dirName, dir, level) {
      if (onlyChildIsSingleSubdir(dir)) {
        const [subDirName, subDir] = Object.entries(dir.subDirs)[0];
        return createDirectoryNode(`${dirName}/${subDirName}`, subDir, level);
      }

      const dirNode = document.createRange().createContextualFragment(
        dirNodeTemplate
          .replaceAll('{{dirName}}', dirName)
          .replaceAll('{{level}}', level)
          .replaceAll('{{fullName}}', dir.fullName)
      );
      dirNode.querySelector('ul').append(
        ...buildDirectoryNodes(dir, level + 1)
      );
      dirNode.querySelector('ul').append(
        ...buildFileNodes(dir.files, level + 1)
      );
      return dirNode;
    }

    /**
     * 
     * @param {Directory} dir 
     * @returns 
     */
    function onlyChildIsSingleSubdir(dir) {
      return (dir.files.length === 0) &&
        (Object.keys(dir.subDirs).length === 1);
    }

    /**
     * 
     * @param {string} path 
     */
    function filterPath(path, hiddenSet, adjustTree) {
      const replacementPattern = toMultiRegex(path);
      hideTableOfContentsEntry(replacementPattern, hiddenSet);
      hideDiffEntry(replacementPattern, hiddenSet);
      if (adjustTree) hideTreeEntry(replacementPattern, hiddenSet);
      updateCounts();
    }

    /**
     * 
     * @param {string} path 
     */
    function unfilterPath(path, hiddenSet, adjustTree) {
      const replacementPattern = toMultiRegex(path);
      showTableOfContentsEntry(replacementPattern, hiddenSet);
      showDiffEntry(replacementPattern, hiddenSet);
      if (adjustTree) showTreeEntry(replacementPattern, hiddenSet);
      updateCounts();
    }

    /**
     * 
     * @param {string} pattern 
     */
    function hideTableOfContentsEntry(pattern, hiddenSet) {
      [...document.querySelectorAll('#toc a[href^="#diff"]')]
        .filter(el => el.textContent.match(pattern))
        .map(el => el.closest('li'))
        .forEach(el => hide(el, hiddenSet));
    }

    /**
     * 
     * @param {string} pattern 
     */
    function showTableOfContentsEntry(pattern, hiddenSet) {
      [...document.querySelectorAll('#toc a[href^="#diff"]')]
        .filter(el => el.textContent.match(pattern))
        .map(el => el.closest('li'))
        .forEach(el => show(el, hiddenSet));
    }

    /**
     * 
     * @param {string} pattern 
     */
    function hideDiffEntry(pattern, hiddenSet) {
      [...document.querySelectorAll(`[data-tagsearch-path]`)]
        .filter(el => el.attributes['data-tagsearch-path']?.value.match(pattern))
        .forEach(el => hide(el, hiddenSet));
    }

    /**
     * 
     * @param {string} pattern 
     */
    function showDiffEntry(pattern, hiddenSet) {
      [...document.querySelectorAll(`[data-tagsearch-path]`)]
        .filter(el => el.attributes['data-tagsearch-path']?.value.match(pattern))
        .forEach(el => show(el, hiddenSet));
    }

    function hideTreeEntry(pattern, hiddenSet) {
      [...document.querySelectorAll('file-tree [title]')]
        .filter(el => el.attributes['title']?.value.match(pattern))
        .map(el => el.closest('li'))
        .forEach(el => hide(el, hiddenSet));
    }

    function showTreeEntry(pattern, hiddenSet) {
      [...document.querySelectorAll('file-tree [title]')]
        .filter(el => el.attributes['title']?.value.match(pattern))
        .map(el => el.closest('li'))
        .forEach(el => show(el, hiddenSet));
      
    }

    /**
     * 
     */
    function updateCounts() {
      const diffStats = document.querySelectorAll(`.file:not([hidden]) .file-info>.sr-only`);
      const fileCount = diffStats.length;
      const {additions, deletions} = getChanges(diffStats);

      const statsDiv = document.querySelector('#toc > div:nth-child(2)');
      const changedFiles = fileCount === 1 ? `1 changed file` : `${fileCount} changed files`;
      const additionText = additions === 1 ? `1 addition` : `${additions} additions`;
      const deletionText = deletions === 1 ? `1 deletion` : `${deletions} deletions`;
      statsDiv.innerHTML = ` Showing <strong>${changedFiles}</strong> with <strong>${additionText}</strong> and <strong>${deletionText}</strong>`;
    }

    /**
     * @param {NodeListOf<Element>} diffStats
     */
    function getChanges(diffStats) {
      const changes = {
        additions: 0,
        deletions: 0
      }
      diffStats.forEach(({innerText}) => {
        changes.additions += getDiffStat(innerText, additionsRegex);
        changes.deletions += getDiffStat(innerText, deletionsRegex);
      });
      return changes;
    }

    function getDiffStat(label, regex) {
      return parseInt(
        (label?.match(regex) ?? ['0'])[0]
      );
    }

    function toMultiRegex(wildcardPattern) {
      const regexParts = wildcardPattern.split(',')
        .map(toRegex)
      return `(${regexParts.join('|')})`
    }

    /**
     * 
     * @param {string} wildcardPattern 
     * @returns 
     */
    function toRegex(wildcardPattern) {
      const regexPattern = wildcardPattern
        // Replace everything but wildcards (*, ?) and parenthesis
        .replace(/[-\/\\^$+.|[\]{}]/g, '\\$&')
        .replace(/\s+/g, '')
        .replace(/\*/g, ".*");
      return `^${regexPattern}$`;
    }

    /**
     * 
     * @returns 
     */
    function getPathTree() {
      return [...document.querySelectorAll('[data-tagsearch-path]')]
        .map(el => ({
          href: el.querySelector('a.Link--primary').href,
          path: el.attributes['data-tagsearch-path'].value,
          type: getType(el)
        }))
        .map(({ path, href, type }) => ({
          href: href,
          fullName: path,
          fileName: path.split('/').slice(-1)[0],
          folders: path.split('/').slice(0, -1),
          type
        }))
        .reduce(addToTree, emptyDir(''));
    }

    function getType(el) {
      if (el.attributes['data-file-deleted']?.value === 'true') {
        return 'deleted';
      } else if (el.querySelector('.file-header')?.innerText.includes('→')) {
        return 'renamed';
      } else {
        return 'modified'
      }
      // TODO: Figure out how to determine "added"
    };

    /**
     * 
     * @param {Directory} tree 
     * @param {PathInfo} pathInfo 
     * @returns 
     */
    function addToTree(tree, pathInfo) {
      let parentDir = tree;
      pathInfo.folders.forEach(name => {
        const fullName = (parentDir.fullName ? `${parentDir.fullName}/${name}` : name);
        let dir = parentDir.subDirs[name];
        if (!dir) {
          dir = parentDir.subDirs[name] = emptyDir(fullName);
        }
        parentDir = dir;
      });
      const { fullName, fileName, href, type } = pathInfo;
      parentDir.files.push({
        fullName,
        fileName,
        href,
        type
      });
      return tree;
    }

    /**
     * 
     * @returns {Directory}
     */
    function emptyDir(fullName) {
      return {
        fullName,
        files: [],
        subDirs: {}
      };
    }

    /**
     * 
     * @param {HTMLElement} el 
     */
    function hide(el, hiddenSet) {
      if (!hiddenSet.has(el)) {
        el.hidden = true;
        hiddenSet.add(el);
      }
    }

    /**
     * 
     * @param {HTMLElement} el 
     */
    function show(el, hiddenSet) {
      if (hiddenSet.has(el)) {
        hiddenSet.delete(el);
        el.hidden = shouldMarkHidden(el);
      }
    }

    function shouldMarkHidden(el) {
        return hiddenElements.has(el) || excludedElements.has(el) || notIncludedElements.has(el);
    }

    function debounce(callback, ms) {
      let timeout;
      return function(...args) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(callback, ms, ...args);
      }
    }
  }
})();
