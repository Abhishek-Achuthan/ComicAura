function showToast(message,type ='info') {
    if(typeof toastr !== 'undefined') {
        toastr.options = {
            positionClass : "toast-top-right",
            timeOut : 3000,
            closeButton : true,
            progressBar :true
        };
        switch(type) {
            case 'success':
                toastr.success(message);
                break;
            case 'error':
                toastr.error(message);
            case 'warning':
                toastr.warning(message);
                break;
            default:
                toastr.info(message);
        }
    }
  
}