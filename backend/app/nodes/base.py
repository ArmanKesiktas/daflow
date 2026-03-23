from abc import ABC, abstractmethod
from typing import Any, Dict


class BaseNodeProcessor(ABC):
    """
    Abstract base class for all node processors.

    Every node in the workflow graph maps to a subclass of this.
    The `execute` method receives:
      - inputs:  dict mapping handle names → upstream node output values
      - config:  the node's configuration dict from `node.data.config`

    It must return a dict that becomes the node's output,
    which downstream nodes will receive as their inputs.
    """

    # Declare expected input and output keys for documentation / validation
    input_schema: Dict[str, str] = {}   # e.g. {"dataframe": "DataFrame"}
    output_schema: Dict[str, str] = {}  # e.g. {"dataframe": "DataFrame", "statistics": "dict"}

    @abstractmethod
    def execute(self, inputs: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
        """Run the node's algorithm and return its output dict."""
        ...

    def validate_inputs(self, inputs: Dict[str, Any]) -> None:
        """Raise ValueError if required inputs are missing."""
        for key in self.input_schema:
            if key not in inputs or inputs[key] is None:
                raise ValueError(
                    f"{self.__class__.__name__}: missing required input '{key}'"
                )
