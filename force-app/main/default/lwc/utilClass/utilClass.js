
export const validate = (template) =>{
    const allValid = [...template.querySelectorAll('lightning-input'), ...template.querySelectorAll('lightning-combobox'), ...template.querySelectorAll('lightning-dual-listbox')]
        .reduce((validSoFar, inputCmp) => {
            inputCmp.reportValidity();
            return validSoFar && inputCmp.checkValidity();
        }, true);
    
    return allValid;
};


export * from './utilClass';