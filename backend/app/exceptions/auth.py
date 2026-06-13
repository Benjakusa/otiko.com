class AuthenticationError(Exception):
    """Raised when authentication credentials or Firebase token verification fails"""
    def __init__(self, message: str = "Unauthorized organizer authentication."):
        self.message = message
        super().__init__(self.message)
