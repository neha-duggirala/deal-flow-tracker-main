import os
from dotenv import load_dotenv
from langchain_gigachat import GigaChat
from langchain_gigachat.embeddings.gigachat import GigaChatEmbeddings

# Load environment variables from the .env file
load_dotenv()


class LLM:
    """
    A factory class to provide the LLM for a LangGraph workflow.
    Designed to easily swap between GigaChat, or others.
    """

    def __init__(self, provider: str = "gigachat", model_name: str = "GigaChat-Max"):
        self.provider = provider.lower()
        self.model_name = model_name
        self.client = self._initialize_llm()

    def _initialize_llm(self):
        credentials = os.getenv("GIGACHAT_CREDENTIALS")
        return GigaChat(model=self.model_name, credentials=credentials, verify_ssl_certs=False,  auth_url="https://developers.sber.ru/docs/api/gigachat/auth/v2/oauth"
)

    def get_embedding_model(self):

        return GigaChatEmbeddings(
            model="EmbeddingsGigaR",
            credentials=os.getenv("GIGACHAT_CREDENTIALS"),
            verify_ssl_certs=False,
            auth_url="https://developers.sber.ru/docs/api/gigachat/auth/v2/oauth"
)
        
        # raise NotImplementedError("GigaChat Embeddings not configured.")

    def get_model(self):
        """
        Returns the LangChain model instance to be used in LangGraph nodes.
        """
        return self.client


# ==========================================
# Example Usage in your LangGraph workflow:
# ==========================================
if __name__ == "__main__":
    # 1. Initialize with Gemini
    llm_manager = LLM(provider="gigachat")
    chat_model = llm_manager.get_model()
    embedding_model = llm_manager.get_embedding_model()

    # Test the model
    response = chat_model.invoke("Hello, who are you?")
    print(response.content)
    # embedding = embedding_model.embed_query("HEllo")
    # print(embedding)

    # Later, when you want to switch to GigaChat, you just do:
    # llm_manager = LLM(provider="gigachat")
    # chat_model = llm_manager.get_model()
