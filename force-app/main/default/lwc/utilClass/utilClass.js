
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { ShowSpinnerEvent } from 'c/showSpinnerEvent';
import { HideSpinnerEvent } from 'c/hideSpinnerEvent';



export const showToast = (title, message, variant) => {
    const event = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
    });
    this.dispatchEvent(event);
};

export const showSpinner = () => {
    const spinner = new ShowSpinnerEvent();
    dispatchEvent(spinner);
};

export const hideSpinner = () => {
    const spinner = new HideSpinnerEvent();
    dispatchEvent(spinner);
};

export const validate = (template) =>{
    const allValid = [...template.querySelectorAll('lightning-input'), ...template.querySelectorAll('lightning-combobox')]
        .reduce((validSoFar, inputCmp) => {
            inputCmp.reportValidity();
            return validSoFar && inputCmp.checkValidity();
        }, true);
    
    return allValid;
};



export * from './utilClass';