// Toast configuration
const toastConfig = {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
};

document.write(`
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css" rel="stylesheet"/>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
`);

window.addEventListener('load', function() {
    toastr.options = toastConfig;
});

function showSuccessToast(message) {
    toastr.success(message);
}

function showErrorToast(message) {
    toastr.error(message);
}

function showInfoToast(message) {
    toastr.info(message);
}

function showWarningToast(message) {
    toastr.warning(message);
}