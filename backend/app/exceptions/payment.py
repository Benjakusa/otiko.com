class MpesaError(Exception):
    """Raised when there is an error during M-Pesa STK-push or Callback transactions"""
    def __init__(self, message: str = "An error occurred during payment processing.", error_code: int = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)
