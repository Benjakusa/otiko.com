class InsufficientInventoryError(Exception):
    """Raised when there are not enough tickets available for a category booking request"""
    def __init__(self, message: str = "Requested ticket count exceeds remaining category tickets."):
        self.message = message
        super().__init__(self.message)
