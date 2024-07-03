(function() {
  'use strict';

  angular
    .module('menubuilder', [])
    .controller('menubuilderController', loadFunction);

  loadFunction.$inject = ['$scope', 'structureService', '$location', '$rootScope', '$translate'];

  function loadFunction($scope, structureService, $location, $rootScope, $translate) {
    // Register upper level modules
    structureService.registerModule($location, $scope, 'menubuilder', $translate.use());
    // --- Start menubuilderController content ---
    structureService.launchSpinner('.holds-the-iframe');
    $rootScope.isBusy  = true;
    var config = $scope.menubuilder.modulescope;
    var configLang = $scope.menubuilder.modulescopeLang;
    var lang = $translate.use().replace('_', '-');
    var iframeConfig = `
    <base target='_parent'></base>
    ${getLinks(structureService.getFonts(), "url")}
    
    <style>
        :root{
            ${getCssVars(structureService.getColors())}
            ${getCssVars(structureService.getFonts(), "name")}
        }
    </style>
    `;

    structureService.getCurrentModules($location, function(modules){
      console.log("currentModules", modules)
      console.log(modules[modules.length -1]);
      if(modules[modules.length -1].identifier === "menubuilder"){
        $scope.moduleUniqueId = modules[modules.length -1].uniqueId.split("-")[1];
      }
      console.log($scope.moduleUniqueId);
    })
    
    
    getMenu().then(function(menu){
        iframeConfig += `
        <script>
        
          domExist("#koaMenu").then(loadItems);
          function loadItems(){
              const menuContainer = document.getElementById("koaMenu");
              const menu = ${JSON.stringify(menu)};
              const template = \`${config.menuTemplate}\`;
              
              menu.forEach((item)=>{
                  menuContainer.innerHTML += renderTemplate(template, item);
              });
          }
          
          function renderTemplate(template, data) {
            const regex = /{{([^{}]+)}}/g; // match tags inside {{ }}
            const matches = template.match(regex); // find all matches in template
            if (!matches) {
              return template; // no matches found, return original string
            }
            // iterate over matches and replace tags with corresponding values
            for (const match of matches) {
              const tag = match.slice(2, -2); // remove the opening and closing {{}}
              const value = data[tag]; // look up value from data object
              template = template.replace(match, value); // replace tag with value
            }
            return template;
          }
          function domExist(selector) {
            return new Promise((resolve) => {
              const element = document.querySelector(selector);
              if (element) {
                resolve(element);
              } else {
                const observer = new MutationObserver(() => {
                  const element = document.querySelector(selector);
                  if (element) {
                    observer.disconnect();
                    resolve(element);
                  }
                });
                observer.observe(document.documentElement, { childList: true, subtree: true });
              }
            });
          }

      </script>
        `;
    }).catch(function(err){
        console.log(err);
    }).finally(renderContent)
 
    function renderContent(){
        if (config.useTranslate) {
          $scope.content = iframeConfig + configLang[lang].codeLang
        } else {
          $scope.content = iframeConfig + config.code;
        }
        addContentToShadowDOM("html-menu-builder", $scope.content);
    }
    
    function processHtml(htmlString) {
        // Create a temporary element to parse the HTML string
        const tempElement = document.createElement('div');
        tempElement.innerHTML = htmlString;

        // Extract all <script> elements
        const scripts = tempElement.getElementsByTagName('script');
        let scriptContents = [];

        while (scripts.length > 0) {
            // Store the script content in the array
            scriptContents.push(scripts[0].textContent);
            // Remove the script element from the DOM
            scripts[0].parentNode.removeChild(scripts[0]);
        }

        return [tempElement.innerHTML, scriptContents];
    }

    function addContentToShadowDOM(containerId, htmlString) {
        // Get the container element (shadow)
        const container = document.getElementById(containerId);

        // Prepare scripts
        const [html, scripts] = processHtml(htmlString);

        // Attach shadow DOM to the container
        const shadowRoot = container.attachShadow({ mode: 'open' });

        // Create a new template element with the cleaned HTML
        const templateHtml = document.createElement('template');
        templateHtml.innerHTML = html;      

        // Append the content of the template html to the shadow root
        shadowRoot.appendChild(templateHtml.content.cloneNode(true));

        scripts.forEach(script => {
            const modifiedScript = script.replace(/document/g, 'shadowRoot');
            const scriptElem = document.createElement('script');
            scriptElem.textContent = `
                (() => {
                    const shadowRoot = document.getElementById('${containerId}').shadowRoot;
                    ${modifiedScript}
                })();
            `;
            shadowRoot.appendChild(scriptElem.cloneNode(true));
        });
    }
    
    /*
    //code for demo uncoment this to test
    //get color vars
    console.log(getCssVars(structureService.getColors()));
    //get fonts vars
    console.log(getCssVars(structureService.getFonts(), "name" ));
    //get links for the fonts
    console.log(getLinks(structureService.getFonts(), "url"));
    */
    
    
    //shadow dom manager
    function removeScripts(htmlString) {
        // Create a temporary element to parse the HTML string
        const tempElement = document.createElement('div');
        tempElement.innerHTML = htmlString;

        // Remove all <script> elements
        const scripts = tempElement.getElementsByTagName('script');
        while (scripts.length > 0) {
            scripts[0].parentNode.removeChild(scripts[0]);
        }

        return tempElement.innerHTML;
    }
    
    
    //tools 
    function getLinks(obj, urlVar){
        let links = "";
        
        Object.keys(obj).forEach(function(item){
            links += `<link href="${obj[item][urlVar]}" rel="stylesheet">`;
        });
        return links;
    }
    
    function getCssVars(obj, sub){
        let result = "";
        Object.keys(obj).forEach(function(item){
            let itemVal = sub ? `"${obj[item][sub]}"` : obj[item];
            result += `--${item.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
            result += `: ${itemVal};`;
        });
        
        return result;
    }
    
    function getMenu() {
        return new Promise((resolve, reject)=>{
            try{
                var menu = [];
                function processChild(value, index) {
                    structureService.getModule(value.path).then(function(module) {
                      menu.push({
                        text: module.name,
                        icon: module.icon,
                        url: '#' + value.path
                      });
                    });
                }
        
                angular.forEach(config.menuItems, processChild);
                resolve(menu);
            }catch(error){
                reject(error);
            }
        });
    }
        
    // --- End menubuilderController content ---
  }
}());
