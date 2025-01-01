(function(window) {
    const SwalUtil = {
        success: (message, timer = 2000) => {
            return Swal.fire({
                title: 'Success!',
                text: message,
                icon: 'success',
                timer: timer,
                showConfirmButton: false
            });
        },

        error: (message) => {
            return Swal.fire({
                title: 'Error!',
                text: message,
                icon: 'error',
                confirmButtonColor: '#3085d6'
            });
        },

        confirm: async (title, text) => {
            const result = await Swal.fire({
                title: title,
                text: text,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, do it!',
                cancelButtonText: 'No, cancel'
            });
            return result.isConfirmed;
        },

        loading: (message = 'Please wait...') => {
            Swal.fire({
                title: 'Loading',
                text: message,
                allowOutsideClick: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });
        },

        closeLoading: () => {
            Swal.close();
        },

        toast: (message, icon = 'success') => {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });

            Toast.fire({
                icon: icon,
                title: message
            });
        },

        modal: ({title, text, icon, confirmButton = true, timer = 0}) => {
            return Swal.fire({
                title: title,
                text: text,
                icon: icon,
                showConfirmButton: confirmButton,
                timer: timer,
                confirmButtonColor: '#3085d6'
            });
        }
    };

    window.SwalUtil = SwalUtil;
})(window);
