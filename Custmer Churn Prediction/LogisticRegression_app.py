
import streamlit as st

st.markdown("""
<style>
.main {
    background-color: #f5f7fb;
}

h1 {
    color: #2c3e50;
    text-align: center;
    font-size: 40px;
}

.stButton>button {
    background-color: #4CAF50;
    color: white;
    font-size: 18px;
    border-radius: 10px;
    padding: 10px 20px;
}

.stButton>button:hover {
    background-color: #45a049;
}

.stSelectbox label {
    font-weight: bold;
}

.stTextInput label {
    font-weight: bold;
}
</style>
""", unsafe_allow_html=True)


st.markdown(
    "<h1 style='text-align:center; color:#4CAF50;'>Customer Churn Prediction App</h1>",
    unsafe_allow_html=True
)




import streamlit as st
import pandas as pd
import numpy as np
import pickle
from sklearn.preprocessing import LabelEncoder, StandardScaler

label_encoder = LabelEncoder()
scaler = StandardScaler()

# Load Model
model = pickle.load(open('LogisticRegression_model.pkl','rb'))

# create web app

gender = st.selectbox('Select Gender:', options=['Male','Female'])
SeniorCitizen = st.selectbox('You are a Senior Citizen:', options=['Yes','No'])
Partner = st.selectbox('Do You Have a Partner?', options=['Yes','No'])
Dependents = st.selectbox('Are You Dependents on Others?', options=['Yes','No'])
tenure = st.text_input('Enter Your Tenure:')
PhoneService = st.selectbox('Do You Have Phone Service?', options=['Yes','No'])
MultipleLines = st.selectbox('Do You Have Multiple Lines?', options=['No','Yes'])
Contract = st.selectbox('Your Contract:', options=['One Year','Two Year','Month-To-Month'])
TotalCharges = st.text_input('Enter Your Total Charges:')

# Prediction Function
def predictive(gender, SeniorCitizen, Partner, Dependents, tenure, PhoneService, MultipleLines, Contract, TotalCharges):

    # Convert values to numeric
    gender = 1 if gender == "Male" else 0
    SeniorCitizen = 1 if SeniorCitizen == "Yes" else 0
    Partner = 1 if Partner == "Yes" else 0
    Dependents = 1 if Dependents == "Yes" else 0
    PhoneService = 1 if PhoneService == "Yes" else 0
    MultipleLines = 1 if MultipleLines == "Yes" else 0

    contract_map = {
        "Month-To-Month": 0,
        "One Year": 1,
        "Two Year": 2
    }

    Contract = contract_map[Contract]

    tenure = float(tenure)
    TotalCharges = float(TotalCharges)

    data = [[gender, SeniorCitizen, Partner, Dependents, tenure,
             PhoneService, MultipleLines, Contract, TotalCharges]]

    result = model.predict(data)

    return result[0]




tips_not_churn = [
            "Continue providing good customer support",
            "Offer loyalty rewards to long-term customers",
            "Provide occasional discounts",
            "Improve service quality regularly",
            "Maintain transparent billing system",
            "Offer personalized offers",
            "Regularly collect customer feedback",
            "Introduce new service features",
            "Ensure quick issue resolution",
            "Provide referral benefits"
        ]




Retain_tips_churn = [
            "Offer special discount to retain customer",
            "Provide flexible contract options",
            "Improve customer support response time",
            "Offer loyalty rewards",
            "Provide better internet/service plans",
            "Send personalized offers",
            "Conduct customer satisfaction surveys",
            "Provide quick problem resolution",
            "Offer bundle services at lower price",
            "Assign dedicated support for high-risk customers"
        ]

tips_not_churn = pd.DataFrame(tips_not_churn)
Retain_tips_churn = pd.DataFrame(Retain_tips_churn)

# Button
if st.button("Predict"):

    result = predictive(gender, SeniorCitizen, Partner, Dependents, tenure, PhoneService, MultipleLines, Contract, TotalCharges)

    if result == 0:
        st.title("Customer Will Churn")
        st.write("Here Are 10 Tips For Prevention:")
        st.dataframe(tips_not_churn, height=400, width=800)
    else:
        st.title("Customer Will Not Churn")
        st.write("Here Are 10 Tips For Retaintion (Not Churning):")
        st.dataframe(Retain_tips_churn, height=400, width=800)





