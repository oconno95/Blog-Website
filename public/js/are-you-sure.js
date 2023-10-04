
/**
 * 
 * @param {string} form_id 
 * @param {string} message
 */
function confirmBeforeSubmitListener(form_id, message) {
  const form = document.getElementById(form_id);
  form.onsubmit = (e) => e.preventDefault(); //prevent form from submitting by default after this function ends

  if(confirm(message)) {
    form.submit();
  }
}