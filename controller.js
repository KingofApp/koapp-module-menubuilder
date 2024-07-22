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
    //Start the loader
    structureService.launchSpinner('.holds-the-iframe');

    //module options
    var config = $scope.menubuilder.modulescope;
    var configLang = $scope.menubuilder.modulescopeLang;
    var lang = $translate.use().replace('_', '-');

    //Constants definition
    const MODULE_IDENTIFIER         = "menubuilder";
    const MENU_PREFIX_ID            = "html-menu-builder-";
    const INNER_MENU_id             = "koaMenu";  
    const ALTERNATIVE_ITEM_TEMPLATE = "<a href='{{url}}' class='option'>{{text}}</a>";
    const MENU_ITEM_TEMPLATE        = config.menuTemplate || ALTERNATIVE_ITEM_TEMPLATE;

    $rootScope.isBusy  = true;
        
    
   

    //start the flow
    menu_builder_steps();

    async function menu_builder_steps(){
      try{
        //manage translations
        let user_code = config.code;
        if (config.useTranslate) {
          user_code =  configLang[lang].codeLang
        }        

        //get the menú identifier
        $scope.menu_builder_id = await get_menu_unike_id();

        //get menú items
        let menu_items = await getMenu();

        //Create element with user code
        let user_code_dom_element = createDomFromUserCode(user_code);

        //remove scripts from user code, update user_code_dom_element
        let scripts = [];
        [user_code_dom_element, scripts] = await extractScriptsFromUserCode(user_code_dom_element);

        //insert menu items on menu    
        user_code_dom_element = await insertMenuItemsOnCode(user_code_dom_element, menu_items);
        
        //add user code to shadow dom
        let shadowDomElement = await addContentToShadowDOM($scope.menu_builder_id, user_code_dom_element);

        //process the scripts and add them to shadow dom 
        shadowDomElement = await injectScriptsToShadowDOM(shadowDomElement, scripts, modifyScript);

      }catch(error){
        //error handle
        console.error(error.message);
      }
    }

    //get menú identifier
    async function get_menu_unike_id(){    
      return new Promise(function (resolve, reject){
        //extract modules from location path
        structureService.getCurrentModules($location, function(currentPathModules){
          //make copy of the modules array to avoid modifications
          const currentPathModules_copy = JSON.parse(JSON.stringify(currentPathModules));
          const last_module_on_path = currentPathModules_copy.pop();
      
          if(last_module_on_path.identifier != MODULE_IDENTIFIER){
            reject("Cant find module");
          }
          
          let moduleUniqueId = last_module_on_path.uniqueId.split("-")[1];     
          
          resolve(`${MENU_PREFIX_ID}${moduleUniqueId}`);
        });
      });
    }

    //get menú items
    async function getMenu() {
      try {
        //make a copy of the menu items array
        let menu_items_copy = config.menuItems;

        //process all modules
        const menu = await Promise.all(
          menu_items_copy.map(async (value) => {  

            const module = await structureService.getModule(value.path);
            return {
              text: module.name,
              icon: module.icon,
              url: '#' + value.path
            };

          })
        );

        return menu;
      } catch (error) {
        throw error;
      }
    }

    //create a dom element to allow manipulation of user code
    function createDomFromUserCode(user_code){
      const tempElement = document.createElement('div');
      tempElement.innerHTML = user_code;
      return tempElement;
    }

    //remove the scripts from 
    async function extractScriptsFromUserCode(domElement ){
      // Extract all <script> elements
      const scripts = domElement.getElementsByTagName('script');
      let scriptContents = [];

      while (scripts.length > 0) {
          // Store the script content in the array
          scriptContents.push(scripts[0].textContent);
          // Remove the script element from the DOM
          scripts[0].parentNode.removeChild(scripts[0]);
      }

      return [domElement, scriptContents];
    }

    //insert menú items on user code
    async function insertMenuItemsOnCode(domElement, menu_items){
      let innerMenuContainer = domElement.querySelector(`#${INNER_MENU_id}`);
      
      if(!innerMenuContainer) return domElement;

      menu_items.forEach((item)=>{
        innerMenuContainer.innerHTML += renderTemplate(MENU_ITEM_TEMPLATE, item);
      });

      return domElement;


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

    }

    //insert code on shadow dom template
    async function addContentToShadowDOM(shadow_container, element_to_insert){
      // Get the container element (shadow)
      const container = document.getElementById(shadow_container);

      // Attach shadow DOM to the container
      const shadowRoot = container.attachShadow({ mode: 'open' });

      // Create a new template element with the cleaned HTML
      const templateHtml = document.createElement('template');
      templateHtml.innerHTML = element_to_insert.innerHTML;      

      // Append the content of the template html to the shadow root
      shadowRoot.appendChild(templateHtml.content.cloneNode(true));

      return shadowRoot;
    }

    //modify script
    async function modifyScript(script){
        script = script.replace(/document/g, 'shadowRoot');
        const scriptElem = document.createElement('script');
        scriptElem.textContent = `
                     (() => {
                         const shadowRoot = document.getElementById('${containerId}').shadowRoot;
                         ${modifiedScript}
                     })();
                 `;

      return scriptElem;
    }

    //add scripts to shadow dom
    async function injectScriptsToShadowDOM(shadowRoot, scripts, scriptModifications) {
      scripts.forEach(async script => {
        let scriptElem = await scriptModifications(script);
        shadowRoot.appendChild(scriptElem.cloneNode(true));
      });
      return shadowRoot;
    }

    // --- End menubuilderController content ---
  }
}());
